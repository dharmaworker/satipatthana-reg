import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

export async function sendMail({
  to,
  subject,
  html,
  cc,
  bcc,
}: {
  to: string
  subject: string
  html: string
  cc?: string | string[]
  bcc?: string | string[]
}) {
  try {
    const result = await transporter.sendMail({
      from: `台灣四念處學會 <${process.env.GMAIL_USER}>`,
      to,
      cc,
      bcc,
      subject,
      html,
    })
    console.log('Mail sent:', result.messageId, 'to:', to, 'cc:', cc ?? '—')
    return result
  } catch (err) {
    console.error('Mail error:', err)
    throw err
  }
}