import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM || '台灣四念處學會 <no-reply@satipatthana.org.tw>'

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
