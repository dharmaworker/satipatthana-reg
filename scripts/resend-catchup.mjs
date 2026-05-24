// resend-catchup.mjs
// 讀取 failed-emails.json，逐一透過 Resend API 補寄失敗郵件。
//
// 用法：
//   RESEND_API_KEY=xxx RESEND_FROM='台灣四念處學會 <no-reply@tw-satipatthana-2026-reg.org>' \
//     node scripts/resend-catchup.mjs
//
// ⚠️ 注意事項：
//   - 執行前請先確認 failed-emails.json 內容正確，並在 Resend Dashboard 人工核對失敗原因。
//   - 確認根本問題已修復（域名已驗證、DNS 已生效）再執行，否則仍會失敗。
//   - RESEND_FROM 必須使用已在 Resend 驗證的域名，否則寄送會被拒絕。

import { readFileSync } from 'fs'

const API_KEY = process.env.RESEND_API_KEY
if (!API_KEY) { console.error('RESEND_API_KEY not set'); process.exit(1) }

const FROM = process.env.RESEND_FROM || '台灣四念處學會 <no-reply@satipatthana.org.tw>'

const failed = JSON.parse(readFileSync('failed-emails.json', 'utf8'))
console.log(`Loaded ${failed.length} emails to resend`)

async function resendOne(entry) {
  // Fetch full content (list API doesn't include html)
  const getRes = await fetch(`https://api.resend.com/emails/${entry.id}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!getRes.ok) throw new Error(`GET ${entry.id} failed: ${getRes.status}`)
  const email = await getRes.json()

  const postRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(email.to) ? email.to : [email.to],
      subject: email.subject,
      html: email.html ?? email.text,
    }),
  })
  const result = await postRes.json()
  if (!postRes.ok) throw new Error(`POST failed: ${JSON.stringify(result)}`)
  return result.id
}

;(async () => {
  let ok = 0, err = 0
  for (const entry of failed) {
    try {
      const newId = await resendOne(entry)
      console.log(`✓ ${entry.id} (${entry.to}) → ${newId}`)
      ok++
    } catch (e) {
      console.error(`✗ ${entry.id} (${entry.to}): ${e.message}`)
      err++
    }
  }
  console.log(`\nDone: ${ok} sent, ${err} failed`)
})()
