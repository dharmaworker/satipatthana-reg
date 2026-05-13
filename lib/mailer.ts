import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM || '台灣四念處學會 <no-reply@satipatthana.org.tw>'

const ALERT_EMAIL = 'dharmaworker2.tw@gmail.com'

export async function sendMail({
  to,
  subject,
  html,
  cc,
  bcc,
  attachments,
}: {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
}) {
  try {
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
    console.log('Mail sent via Resend:', result.data?.id, 'to:', to)
    return result
  } catch (err) {
    console.error('sendMail failed:', err, '| to:', to, '| subject:', subject)
    // 直接呼叫 Resend，不透過 sendMail 避免遞迴
    resend.emails.send({
      from: FROM,
      to: [ALERT_EMAIL],
      subject: `⚠️ Email 發送失敗：${subject}`,
      html: `<p><strong>收件人：</strong>${Array.isArray(to) ? to.join(', ') : to}</p>
             <p><strong>主旨：</strong>${subject}</p>
             <p><strong>錯誤：</strong>${err instanceof Error ? err.message : String(err)}</p>`,
    }).catch(() => {})
    throw err
  }
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
    results.push(r)
  }
  return results
}
