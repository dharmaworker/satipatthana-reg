#!/usr/bin/env node
// resend-cli.mjs — Resend 郵件查詢與補寄工具
//
// 用法：
//   RESEND_API_KEY=xxx node scripts/resend-cli.mjs --list [--day YYYY-MM-DD | --hours N] [--status s1,s2] [--out file.json]
//   RESEND_API_KEY=xxx RESEND_FROM='台灣四念處學會 <no-reply@...>' node scripts/resend-cli.mjs --resend [file.json]
//
// ⚠️ 補寄前請先在 Resend Dashboard 人工確認失敗原因已修復
//   （域名驗證、DNS 生效、退信地址正確），確認根本原因排除後再執行。

import { readFileSync, writeFileSync } from 'fs'

const PAGE_LIMIT = 100
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── arg parsing ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flag = name => args.includes(name)
const argVal = name => {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1].trim() : null
}
const argList = name => {
  const v = argVal(name)
  return v ? v.split(',').map(s => s.trim()).filter(Boolean) : null
}

// ─── help ─────────────────────────────────────────────────────────────────────
function help() {
  console.log(`resend-cli.mjs — Resend 郵件查詢與補寄工具

指令（擇一）：
  --help                  顯示此說明
  --list                  查詢 Resend 郵件紀錄
  --resend [file.json]    補寄郵件（預設讀取 failed-emails.json）

--list 選用篩選條件：
  --hours N               最近 N 小時（預設 72）
  --days N                最近 N 天（等同 --hours N*24）
  --status s1,s2,...      狀態篩選，如 failed,bounced,delivered,sent
  --search text           文字篩選（比對主旨或收件人，不分大小寫）
  --out file.json         將結果輸出至 JSON 檔

必要環境變數：
  RESEND_API_KEY          Resend API 金鑰（所有指令皆需要）
  RESEND_FROM             補寄寄件人（僅 --resend 需要）

⚠️  補寄前請先在 Resend Dashboard 確認根本原因已修復。
`)
}

// ─── Resend API ───────────────────────────────────────────────────────────────
function requireApiKey() {
  if (!process.env.RESEND_API_KEY) { console.error('RESEND_API_KEY not set'); process.exit(1) }
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text()}`)
  return res.json()
}

// ─── --list ───────────────────────────────────────────────────────────────────
async function listEmails() {
  requireApiKey()

  const hours = argVal('--hours')
  const statuses = argList('--status')
  const search = argVal('--search')?.toLowerCase()
  const outFile = argVal('--out')

  const days = argVal('--days')
  const h = days ? Number(days) * 24 : (Number(hours) || 72)
  const cutoffStart = new Date(Date.now() - h * 3600_000)
  console.log(`Listing emails from last ${h}h${statuses ? `, status: ${statuses.join(',')}` : ''}`)

  const results = []
  let cursor = null
  let scanned = 0
  let prevFirstId = null
  let done = false

  while (!done) {
    const params = `limit=${PAGE_LIMIT}${cursor ? `&after=${cursor}` : ''}`
    console.log(`  [fetch] /emails?${params}`)
    const json = await apiFetch(`/emails?${params}`)
    const emails = json.data ?? json.emails ?? []
    if (!emails.length) break

    const pageFirstId = emails[0].id
    if (pageFirstId === prevFirstId) { console.log('Pagination looped — stopping.'); break }
    prevFirstId = pageFirstId

    for (const email of emails) {
      const createdAt = new Date(email.created_at)
      if (createdAt < cutoffStart) { done = true; break }
      if (statuses && !statuses.includes(email.last_event)) continue
      if (search) {
        const toStr = (Array.isArray(email.to) ? email.to.join(' ') : (email.to ?? '')).toLowerCase()
        const subj = (email.subject ?? '').toLowerCase()
        if (!toStr.includes(search) && !subj.includes(search)) continue
      }
      results.push({
        id: email.id,
        to: email.to,
        subject: email.subject,
        status: email.last_event,
        created_at: email.created_at,
      })
    }

    scanned += emails.length
    console.log(`  Scanned ${scanned}, matched ${results.length}`)
    if (!json.has_more || emails.length < PAGE_LIMIT) break
    cursor = emails[emails.length - 1].id
    await sleep(600)
  }

  // Table output
  console.log()
  console.log(`${'id'.padEnd(38)} ${'created_at'.padEnd(20)} ${'status'.padEnd(12)} ${'to'.padEnd(32)} subject`)
  console.log('-'.repeat(130))
  for (const e of results) {
    const to = (Array.isArray(e.to) ? e.to.join(', ') : (e.to ?? '—')).slice(0, 32)
    const ts = e.created_at.replace('T', ' ').slice(0, 19)
    console.log(`${e.id.padEnd(38)} ${ts.padEnd(20)} ${(e.status ?? '—').padEnd(12)} ${to.padEnd(32)} ${e.subject ?? ''}`)
  }
  console.log(`\nTotal: ${results.length}`)

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(results, null, 2))
    console.log(`Saved to ${outFile}`)
  }
}

// ─── --resend ─────────────────────────────────────────────────────────────────
async function resendEmails() {
  requireApiKey()

  const FROM = process.env.RESEND_FROM || '台灣四念處學會 <no-reply@tw-satipatthana-2026-reg.org>'
  const file = argVal('--resend') ?? 'failed-emails.json'

  let entries
  try {
    entries = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`Cannot read ${file}: ${e.message}`)
    process.exit(1)
  }

  console.log(`Loaded ${entries.length} emails from ${file}`)
  console.log(`From: ${FROM}\n`)

  let ok = 0, err = 0
  for (const entry of entries) {
    try {
      const email = await apiFetch(`/emails/${entry.id}`)
      const result = await apiFetch('/emails', {
        method: 'POST',
        body: JSON.stringify({
          from: FROM,
          to: Array.isArray(email.to) ? email.to : [email.to],
          subject: email.subject,
          html: email.html ?? email.text,
        }),
      })
      console.log(`✓ ${entry.id} (${entry.to}) → ${result.id}`)
      ok++
    } catch (e) {
      console.error(`✗ ${entry.id} (${entry.to}): ${e.message}`)
      err++
    }
    await sleep(200)
  }
  console.log(`\nDone: ${ok} sent, ${err} failed`)
}

// ─── dispatch ─────────────────────────────────────────────────────────────────
async function main() {
  if (flag('--help') || args.length === 0) { help(); return }
  if (flag('--list'))   { await listEmails(); return }
  if (flag('--resend')) { await resendEmails(); return }
  console.error('Unknown command. Use --help.')
  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
