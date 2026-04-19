import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLodgingArchiveEmail } from '@/lib/archive-email'
import { sendLodgingInvitationEmail } from '@/lib/lodging-invitation-email'
import * as crypto from 'crypto'

const HASH_KEY = process.env.ECPAY_HASH_KEY!
const HASH_IV = process.env.ECPAY_HASH_IV!

function verifyCheckMacValue(params: Record<string, string>): boolean {
  const { CheckMacValue, ...rest } = params
  
  const sorted = Object.keys(rest)
    .sort()
    .reduce((acc, key) => ({ ...acc, [key]: rest[key] }), {} as Record<string, string>)

  let str = `HashKey=${HASH_KEY}&` +
    Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join('&') +
    `&HashIV=${HASH_IV}`

  str = encodeURIComponent(str).toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*')
    .replace(/%2d/g, '-')
    .replace(/%2e/g, '.')
    .replace(/%5f/g, '_')

  const hash = crypto.createHash('sha256').update(str).digest('hex').toUpperCase()
  return hash === CheckMacValue
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    // 驗證綠界簽章
    if (!verifyCheckMacValue(params)) {
      return new NextResponse('0|ErrorMessage', { status: 200 })
    }

    const { RtnCode, CustomField1: registration_id } = params

    // 付款成功
    if (RtnCode === '1') {
      // 先看當前 payment_status 是否為首次繳費
      const { data: prev } = await supabaseAdmin
        .from('registrations')
        .select('payment_status')
        .eq('id', registration_id)
        .single()
      const wasUnpaid = !prev || prev.payment_status === 'unpaid' || prev.payment_status === null

      // 組刷卡備註：綠界交易號 + 實際付款時間 + 付款方式 + 金額
      const tradeNo = params.TradeNo || ''
      const paymentDate = params.PaymentDate || ''
      const paymentType = params.PaymentType || ''
      const tradeAmt = params.TradeAmt || ''
      const note = `刷卡付款（綠界）｜交易號：${tradeNo}｜付款時間：${paymentDate}｜類型：${paymentType}｜金額：${tradeAmt}`

      await supabaseAdmin
        .from('registrations')
        .update({
          payment_status: 'verified',
          payment_confirmed_at: new Date().toISOString(),
          payment_note: note,
        })
        .eq('id', registration_id)

      // 寄食宿登記備存信給學會信箱（失敗不影響 callback）
      try {
        const { data: fullReg } = await supabaseAdmin
          .from('registrations')
          .select('id, random_code, chinese_name, email, phone, member_id, payment_plan, payment_status, payment_note, payment_confirmed_at')
          .eq('id', registration_id)
          .single()
        if (fullReg) {
          await sendLodgingArchiveEmail(fullReg)
          if (wasUnpaid) {
            try { await sendLodgingInvitationEmail(fullReg) }
            catch (e) { console.error('[callback] 食宿邀請信失敗:', e) }
          }
        }
      } catch (mailErr) {
        console.error('[callback] 食宿備存信失敗:', mailErr)
      }
    }

    return new NextResponse('1|OK', { status: 200 })

  } catch (error) {
    console.error('Callback error:', error)
    return new NextResponse('0|ErrorMessage', { status: 200 })
  }
}