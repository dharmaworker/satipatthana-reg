// 用法：node scripts/test-mail.mjs <收件人 email>
// 用 .env.local 的 GMAIL_USER / GMAIL_APP_PASSWORD 寄一封測試信

import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'

const to = process.argv[2]
if (!to) { console.log('Usage: node scripts/test-mail.mjs <to-email>'); process.exit(1) }

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
  console.log('❌ .env.local 缺 GMAIL_USER 或 GMAIL_APP_PASSWORD')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
})

try {
  const info = await transporter.sendMail({
    from: `台灣四念處學會 <${env.GMAIL_USER}>`,
    to,
    subject: '[測試] satipatthana-reg mailer 驗證',
    html: '<p>這是一封測試信。如果你收到，代表 Gmail 設定正確 ✅</p>',
  })
  console.log('✅ 寄出成功:', info.messageId)
} catch (err) {
  console.log('❌ 寄信失敗:', err.message)
  process.exit(1)
}
