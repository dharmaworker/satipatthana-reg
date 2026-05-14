import { Resend } from 'resend'
import nodemailer from 'nodemailer'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM || '台灣四念處學會 <no-reply@satipatthana.org.tw>'

const ALERT_EMAIL = 'dharmaworker2.tw@gmail.com'

type MailParams = {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
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
export async function sendMailWithRetry(params: MailParams, maxAttempts = 3, baseDelayMs = 600, gmailFallback = true) {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (gmailFallback && attempt === maxAttempts) {
        return await sendOnceViaGmail(params)
      }
      return await sendOnce(params)
    } catch (err) {
      lastErr = err
      console.error(`sendMailWithRetry attempt ${attempt}/${maxAttempts} failed:`, err, '| to:', params.to)
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * attempt))
      }
    }
  }
  sendAlert(params, lastErr, maxAttempts)
  throw lastErr
}

// 批次發送（最多 100 封 / call），用於大量寄信避免 timeout
export async function sendMailBatch(mails: {
  to: string
  subject: string
  html: string
  bcc?: string
}[]) {
  const batches: typeof mails[] = []
  for (let i = 0; i < mails.length; i += 100) {
    batches.push(mails.slice(i, i + 100))
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
      throw new Error(r.error.message)
    }
    results.push(r)
  }
  return results
}
