import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import * as crypto from 'crypto'

const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID!
const HASH_KEY = process.env.ECPAY_HASH_KEY!
const HASH_IV = process.env.ECPAY_HASH_IV!
const PAYMENT_URL = process.env.ECPAY_PAYMENT_URL!

function generateCheckMacValue(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

  let str = `HashKey=${HASH_KEY}&` +
    sorted.map(key => `${key}=${params[key]}`).join('&') +
    `&HashIV=${HASH_IV}`

  str = encodeURIComponent(str)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*')
    .replace(/%2d/g, '-')
    .replace(/%2e/g, '.')
    .replace(/%5f/g, '_')
    .replace(/%7e/g, '~')


  console.log('CheckMac string:', str)
  console.log('CheckMac result:', crypto.createHash('sha256').update(str).digest('hex').toUpperCase())
  return crypto.createHash('sha256').update(str).digest('hex').toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const { registration_id, plan } = await request.json()

    const { data: reg, error } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (error || !reg) {
      return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })
    }

    if (reg.status !== 'approved') {
      return NextResponse.json({ error: '尚未錄取，無法繳費' }, { status: 403 })
    }

    const planAmounts: Record<string, number> = {
      'A1': 18600, 'A2': 19300,
      'B1': 20350, 'B2': 21050,
      'C1': 22590, 'C2': 23290,
      'D1': 20840, 'D2': 21540,
      'T1': 1, 'T2': 1, // 測試用
    }

    const amount = planAmounts[plan] || 18600
    const tradeNo = `SAT${Date.now()}`
    const baseUrl = 'https://satipatthana-reg.vercel.app'

    const now = new Date()
    const tw = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const tradeDate = `${tw.getUTCFullYear()}/${pad(tw.getUTCMonth()+1)}/${pad(tw.getUTCDate())} ${pad(tw.getUTCHours())}:${pad(tw.getUTCMinutes())}:${pad(tw.getUTCSeconds())}`

    const params: Record<string, string> = {
      ChoosePayment: 'Credit',
      ClientBackURL: `${baseUrl}/query`,
      CustomField1: registration_id,
      CustomField2: reg.random_code,
      EncryptType: '1',
      ItemName: `Plan ${plan} Food Lodging Fee`,
      MerchantID: MERCHANT_ID,
      MerchantTradeDate: tradeDate,
      MerchantTradeNo: tradeNo,
      PaymentType: 'aio',
      ReturnURL: `${baseUrl}/api/payment/callback`,
      TotalAmount: String(amount),
      TradeDesc: 'Taiwan Satipatthana Retreat',
    }

    params.CheckMacValue = generateCheckMacValue(params)

    const formHtml = `
      <html>
        <body>
          <form id="ecpay" method="post" action="${PAYMENT_URL}">
            ${Object.entries(params).map(([k, v]) =>
              `<input type="hidden" name="${k}" value="${v}" />`
            ).join('')}
          </form>
          <script>document.getElementById('ecpay').submit();</script>
        </body>
      </html>
    `

    return new NextResponse(formHtml, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: '建立訂單失敗' }, { status: 500 })
  }
}