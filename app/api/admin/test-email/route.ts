import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { to } = await request.json()
  if (!to) return NextResponse.json({ error: '請提供收件地址' }, { status: 400 })

  try {
    await sendMail({
      to,
      subject: '【測試信】Resend 寄信驗證',
      html: '<p>這是一封測試信，確認 Resend 設定正確。</p><p>寄件來源：<strong>no-reply@satipatthana.org.tw</strong></p>',
    })
    return NextResponse.json({ success: true, message: `測試信已寄至 ${to}` })
  } catch (e: any) {
    console.error('[test-email]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
