import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { supabaseAdmin } from './supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM || '台灣四念處學會 <noreply@tw-satipatthana-2026-reg.org>'

const ALERT_EMAIL = 'dharmaworker2.tw@gmail.com'

type MailParams = {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
}

type BatchMail = { to: string; subject: string; html: string; bcc?: string }

const THROTTLED_DOMAINS = ['qq.com', '163.com']

function isThrottled(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  return THROTTLED_DOMAINS.includes(domain)
}

async function logEmailSend(row: {
  to_email: string
  subject: string
  html: string
  bcc?: string | null
  provider: 'resend' | 'gmail' | 'alicloud'
  provider_message_id?: string | null
  status: 'sent' | 'failed'
  error?: string | null
  mail_type?: string | null
  parent_id?: string | null
  batch_id?: string | null
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('email_queue').insert({
    ...row,
    sent_at: row.status === 'sent' ? new Date().toISOString() : null,
  }).select('id').single()
  if (error) {
    console.error('[mailer] logEmailSend failed:', error.message)
    return null
  }
  return data.id
}

async function sendOnce(params: MailParams) {
  const { to, subject, html, cc, bcc, attachments } = params
  const result = await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
    bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
    subject,
    html,
    attachments: attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
    })),
  })
  if (result.error) {
    throw new Error(result.error.message)
  }
  console.log('Mail sent via Resend:', result.data?.id, 'to:', to)
  return result
}

async function sendOnceViaGmail(params: MailParams) {
  const { to, subject, html, cc, bcc } = params
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: Array.isArray(to) ? to.join(', ') : to,
    cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
    bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
    subject,
    html,
  })
  console.log('Mail sent via Gmail fallback to:', to)
}

function sendAlert(params: MailParams, err: unknown, attempts?: number) {
  const toStr = Array.isArray(params.to) ? params.to.join(', ') : params.to
  const retryNote = attempts ? `（已重試 ${attempts} 次）` : ''
  resend.emails.send({
    from: FROM,
    to: [ALERT_EMAIL],
    subject: `⚠️ Email 發送失敗${retryNote}：${params.subject}`,
    html: `<p><strong>收件人：</strong>${toStr}</p>
           <p><strong>主旨：</strong>${params.subject}</p>
           <p><strong>錯誤：</strong>${err instanceof Error ? err.message : String(err)}</p>`,
  }).catch(() => {})
}

export async function sendMail(params: MailParams) {
  try {
    return await sendOnce(params)
  } catch (err) {
    console.error('sendMail failed:', err, '| to:', params.to, '| subject:', params.subject)
    sendAlert(params, err)
    throw err
  }
}

// 有 retry 版本，只在全部失敗才寄警告信
// gmailFallback=true（預設）：最後一次改用 Gmail 備援；false：全程用 Resend
export async function sendMailWithRetry(
  params: MailParams,
  opts?: { mailType?: string; maxAttempts?: number; baseDelayMs?: number; gmailFallback?: boolean }
) {
  const maxAttempts = opts?.maxAttempts ?? 3
  const baseDelayMs = opts?.baseDelayMs ?? 600
  const gmailFallback = opts?.gmailFallback ?? true
  const mailType = opts?.mailType ?? null
  const toEmail = Array.isArray(params.to) ? params.to[0] : params.to
  const bccEmail = Array.isArray(params.bcc) ? params.bcc[0] : (params.bcc ?? null)

  const baseLog = {
    to_email: toEmail, subject: params.subject, html: params.html,
    bcc: bccEmail, mail_type: mailType,
  }

  let lastErr: unknown
  let rootId: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isGmailAttempt = gmailFallback && attempt === maxAttempts
    let attemptErr: unknown = null
    let result: any = null

    try {
      result = isGmailAttempt ? await sendOnceViaGmail(params) : await sendOnce(params)
    } catch (err) {
      attemptErr = err
      lastErr = err
      console.error(`sendMailWithRetry attempt ${attempt}/${maxAttempts} failed:`, err, '| to:', params.to)
    } finally {
      const insertedId = await logEmailSend({
        ...baseLog,
        provider: isGmailAttempt ? 'gmail' : 'resend',
        provider_message_id: result?.data?.id ?? null,
        status: attemptErr ? 'failed' : 'sent',
        error: attemptErr instanceof Error ? attemptErr.message : attemptErr ? String(attemptErr) : null,
        parent_id: rootId,
      })
      if (attempt === 1 && attemptErr) rootId = insertedId
    }

    if (!attemptErr) return isGmailAttempt ? undefined : result
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, baseDelayMs * attempt))
  }
  sendAlert(params, lastErr, maxAttempts)
  throw lastErr
}

async function sendBatchViaGmail(mails: BatchMail[], batchId?: string | null, mailType?: string | null) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
  for (const m of mails) {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: m.to,
      bcc: m.bcc,
      subject: m.subject,
      html: m.html,
    })
    await logEmailSend({
      to_email: m.to,
      subject: m.subject,
      html: m.html,
      bcc: m.bcc ?? null,
      provider: 'gmail',
      status: 'sent',
      mail_type: mailType ?? null,
      batch_id: batchId ?? null,
    })
  }
  console.log(`Batch sent via Gmail fallback: ${mails.length} mails`)
}

// 批次發送（最多 100 封 / call）
// QQ/163 自動寫入 email_queue 由 cron 節流送出
// 其他收件人直接用 Resend batch 送，失敗改 Gmail
export async function sendMailBatch(
  mails: BatchMail[],
  opts?: { mailType?: string; triggeredFrom?: string; description?: string }
): Promise<{ batchId: string | null; results: any[] }> {
  // Create batch envelope row
  let batchId: string | null = null
  const { data: batch, error: batchErr } = await supabaseAdmin
    .from('email_batches')
    .insert({
      triggered_from: opts?.triggeredFrom ?? null,
      recipient_count: mails.length,
      recipients: mails.map(m => m.to),
      description: opts?.description ?? null,
    })
    .select('id')
    .single()
  if (batchErr) {
    console.error('[mailer] email_batches insert failed:', batchErr.message)
  } else {
    batchId = batch.id
  }

  const direct = mails.filter(m => !isThrottled(m.to))
  const queued = mails.filter(m => isThrottled(m.to))

  // QQ/163 → queue (cron drains via AliCloud SMTP)
  if (queued.length > 0) {
    const { error } = await supabaseAdmin.from('email_queue').insert(
      queued.map(m => ({
        to_email: m.to,
        subject: m.subject,
        html: m.html,
        bcc: m.bcc ?? null,
        status: 'pending',
        provider: 'alicloud',
        mail_type: opts?.mailType ?? null,
        batch_id: batchId,
      }))
    )
    if (error) {
      console.error('sendMailBatch: 寫入 email_queue 失敗', error.message)
    } else {
      console.log(`sendMailBatch: ${queued.length} 封 QQ/163 寫入 queue`)
    }
  }

  // Other recipients → Resend batch
  if (direct.length === 0) return { batchId, results: [] }
  const batches: BatchMail[][] = []
  for (let i = 0; i < direct.length; i += 100) {
    batches.push(direct.slice(i, i + 100))
  }
  const results = []
  for (const batch of batches) {
    const r = await resend.batch.send(
      batch.map(m => ({
        from: FROM,
        to: [m.to],
        bcc: m.bcc ? [m.bcc] : undefined,
        subject: m.subject,
        html: m.html,
      }))
    )
    if (r.error) {
      console.error('sendMailBatch Resend failed, falling back to Gmail:', r.error.message)
      await sendBatchViaGmail(batch, batchId, opts?.mailType ?? null)
    } else {
      // Batch insert all log rows in one query (was: sequential await per row → ~20s for 71 records)
      const resendItems: any[] = (r.data as any)?.data ?? []
      const logRows = batch.map((m, i) => ({
        to_email: m.to,
        subject: m.subject,
        html: m.html,
        bcc: m.bcc ?? null,
        provider: 'resend' as const,
        provider_message_id: resendItems[i]?.id ?? null,
        status: 'sent' as const,
        mail_type: opts?.mailType ?? null,
        batch_id: batchId,
        sent_at: new Date().toISOString(),
      }))
      const { error: logErr } = await supabaseAdmin.from('email_queue').insert(logRows)
      if (logErr) console.error('[mailer] batch log insert failed:', logErr.message)
    }
    results.push(r)
  }
  return { batchId, results }
}
