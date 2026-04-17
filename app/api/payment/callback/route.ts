import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
      await supabaseAdmin
        .from('registrations')
        .update({
          payment_status: 'verified',
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq('id', registration_id)
    }

    return new NextResponse('1|OK', { status: 200 })

  } catch (error) {
    console.error('Callback error:', error)
    return new NextResponse('0|ErrorMessage', { status: 200 })
  }
}