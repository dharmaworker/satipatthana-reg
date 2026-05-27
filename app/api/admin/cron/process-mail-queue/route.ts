import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const BATCH_SIZE = 30
const PROCESSING_TIMEOUT_MS = 3 * 60 * 1000 // 3 分鐘後視為卡住，重設為 pending

const resend = new Resend(process.env.RESEND_API_KEY)

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization') || ''
    if (auth === `Bearer ${secret}`) return true
  }
  const role = request.cookies.get('admin_role')?.value
  return role === 'admin'
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  // 把卡住的 processing（超過 3 分鐘）重設回 pending
  const stuckBefore = new Date(Date.now() - PROCESSING_TIMEOUT_MS).toISOString()
  await supabaseAdmin
    .from('email_queue')
    .update({ status: 'pending', processing_at: null })
    .eq('status', 'processing')
    .lt('processing_at', stuckBefore)

  // 取出一批 pending（所有 provider）
  const { data: rows, error } = await supabaseAdmin
    .from('email_queue')
    .select('id, to_email, subject, html, bcc, provider')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    console.error('[mail-queue] 取出 queue 失敗:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'queue 已清空' })
  }

  // 標記為 processing
  const ids = rows.map(r => r.id)
  await supabaseAdmin
    .from('email_queue')
    .update({ status: 'processing', processing_at: new Date().toISOString() })
    .in('id', ids)

  const alicloudTransporter = nodemailer.createTransport({
    host: process.env.ALIBABA_SMTP_HOST,
    port: Number(process.env.ALIBABA_SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.ALIBABA_SMTP_USER,
      pass: process.env.ALIBABA_SMTP_PASSWORD,
    },
  })

  const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const FROM = process.env.RESEND_FROM || '台灣四念處學會 <noreply@tw-satipatthana-2026-reg.org>'

  let sent = 0
  for (const row of rows) {
    try {
      switch (row.provider) {
        case 'resend': {
          const result = await resend.emails.send({
            from: FROM,
            to: [row.to_email],
            bcc: row.bcc ? [row.bcc] : undefined,
            subject: row.subject,
            html: row.html,
          })
          if (result.error) throw new Error(result.error.message)
          await supabaseAdmin
            .from('email_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: result.data?.id ?? null })
            .eq('id', row.id)
          break
        }
        case 'gmail': {
          await gmailTransporter.sendMail({
            from: process.env.GMAIL_USER,
            to: row.to_email,
            bcc: row.bcc ?? undefined,
            subject: row.subject,
            html: row.html,
          })
          await supabaseAdmin
            .from('email_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', row.id)
          break
        }
        default: {
          // alicloud (and any unknown provider falls through to alicloud)
          await alicloudTransporter.sendMail({
            from: process.env.ALIBABA_SMTP_FROM,
            to: row.to_email,
            bcc: row.bcc ?? undefined,
            subject: row.subject,
            html: row.html,
          })
          await supabaseAdmin
            .from('email_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', row.id)
        }
      }
      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[mail-queue] 寄信失敗 ${row.to_email} (${row.provider}):`, msg)
      await supabaseAdmin
        .from('email_queue')
        .update({ status: 'failed', error: msg })
        .eq('id', row.id)
    }
  }

  console.log(`[mail-queue] 本批送出 ${sent}/${rows.length} 封`)
  return NextResponse.json({ ok: true, sent, total: rows.length })
}
