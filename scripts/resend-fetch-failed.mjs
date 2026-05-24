// resend-fetch-failed.mjs
// 從 Resend 撈最近 50 小時失敗/退信郵件，存至 failed-emails.json。
//
// 用法：
//   RESEND_API_KEY=xxx node scripts/resend-fetch-failed.mjs
//
// ⚠️ 注意事項：
//   - API Key 必須屬於失敗郵件所在的 Resend 帳號/團隊。
//     舊域名（satipatthana.org.tw）時期的郵件在舊帳號，需用舊帳號的 Key。
//   - 執行補寄（resend-catchup.mjs）前，請先人工至 Resend Dashboard 確認
//     失敗原因（退信地址？域名未驗證？DNS 尚未生效？），確認根本原因已修復再補寄。

import { writeFileSync } from 'fs'

const API_KEY = process.env.RESEND_API_KEY
if (!API_KEY) { console.error('RESEND_API_KEY not set'); process.exit(1) }

const FAILED_STATUSES = new Set(['bounced', 'failed'])
const PAGE_LIMIT = 100
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchPage(cursor) {
  const params = `limit=${PAGE_LIMIT}${cursor ? `&after=${cursor}` : ''}`
  const url = `https://api.resend.com/emails?${params}`
  console.log(`  [fetch] ${url}`)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(`List emails failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  const emails = json.data ?? json.emails ?? []
  if (emails.length) {
    console.log(`  first: ${emails[0].created_at} ${emails[0].id}`)
    console.log(`  last:  ${emails[emails.length-1].created_at} ${emails[emails.length-1].id}`)
  }
  return json
}

;(async () => {
  const failed = []
  let cursor = null
  let scanned = 0
  let prevFirstId = null
  const cutoff = new Date(Date.now() - 65 * 60 * 60 * 1000)
  let done = false

  while (!done) {
    const page = await fetchPage(cursor)
    const emails = page.data ?? page.emails ?? []
    if (!emails.length) break

    const pageFirstId = emails[0].id
    if (pageFirstId === prevFirstId) {
      console.log('Pagination looped — stopping.')
      break
    }
    prevFirstId = pageFirstId

    for (const email of emails) {
      if (new Date(email.created_at) < cutoff) { done = true; break }
      if (FAILED_STATUSES.has(email.last_event)) {
        failed.push({
          id: email.id,
          to: email.to,
          subject: email.subject,
          status: email.last_event,
          created_at: email.created_at,
        })
        console.log(`  ✗ ${email.created_at} | ${email.last_event} | ${email.to} | ${email.subject}`)
      }
    }

    scanned += emails.length
    console.log(`Scanned ${scanned} emails, ${failed.length} failed so far`)

    if (!page.has_more || emails.length < PAGE_LIMIT) break
    cursor = emails[emails.length - 1].id
    await sleep(600)
  }

  const out = 'failed-emails.json'
  writeFileSync(out, JSON.stringify(failed, null, 2))
  console.log(`\nSaved ${failed.length} failed emails to ${out}`)
})()
