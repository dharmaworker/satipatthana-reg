import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_DELAYED_RETRIES = 1

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET 未設定')
    return NextResponse.json({ error: 'webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const headers = {
    'svix-id':        request.headers.get('svix-id') ?? '',
    'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
    'svix-signature': request.headers.get('svix-signature') ?? '',
  }

  let event: any
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, headers)
  } catch (err) {
    console.error('[resend-webhook] 驗簽失敗:', err)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const type: string = event.type
  if (type !== 'email.bounced' && type !== 'email.failed' && type !== 'email.delivery_delayed') {
    return NextResponse.json({ ok: true })
  }

  const emailId: string = event.data?.email_id
  if (!emailId) {
    return NextResponse.json({ error: 'missing email_id' }, { status: 400 })
  }

  // delivery_delayed 會重複觸發，限制最多補寄 1 次
  if (type === 'email.delivery_delayed') {
    const { data: cfg } = await supabaseAdmin
      .from('site_config')
      .select('value')
      .eq('key', 'webhook_alibaba_attempts')
      .maybeSingle()
    const attempts: Record<string, number> = (cfg?.value as any) ?? {}
    const count = (attempts[emailId] ?? 0) + 1
    if (count > MAX_DELAYED_RETRIES) {
      console.log(`[resend-webhook] ${emailId} 已達阿里雲補寄上限 ${MAX_DELAYED_RETRIES} 次，放棄`)
      return NextResponse.json({ ok: true })
    }
    await supabaseAdmin
      .from('site_config')
      .upsert({ key: 'webhook_alibaba_attempts', value: { ...attempts, [emailId]: count } })
  }

  // 從 Resend API 取回原始郵件內容
  let emailData: any
  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    })
    if (!res.ok) throw new Error(`Resend API ${res.status}`)
    emailData = await res.json()
  } catch (err) {
    console.error('[resend-webhook] 無法取回郵件內容:', emailId, err)
    return NextResponse.json({ error: 'failed to fetch email' }, { status: 500 })
  }

  const to: string[] = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
  const subject: string = emailData.subject ?? ''
  const html: string = emailData.html ?? emailData.text ?? ''

  console.log(`[resend-webhook] ${type}，改用阿里雲補寄 → ${to.join(', ')} | ${subject}`)

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.ALIBABA_SMTP_HOST,
      port: Number(process.env.ALIBABA_SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.ALIBABA_SMTP_USER,
        pass: process.env.ALIBABA_SMTP_PASSWORD,
      },
    })
    for (const addr of to) {
      await transporter.sendMail({ from: process.env.ALIBABA_SMTP_FROM, to: addr, subject, html })
    }
    console.log(`[resend-webhook] 阿里雲補寄成功: ${to.join(', ')}`)
  } catch (err) {
    console.error('[resend-webhook] 阿里雲補寄失敗:', to, err)
    return NextResponse.json({ error: 'alibaba retry failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
