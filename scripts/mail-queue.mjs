#!/usr/bin/env node
// mail-queue.mjs — unified email_queue + email_batches CLI
//
// Usage:
//   node scripts/mail-queue.mjs --help
//   node scripts/mail-queue.mjs --list [--to a@x,b@y] [--status failed|sent|pending|bounced]
//                                       [--hours N] [--batch uuid,...] [--provider p] [--limit N]
//   node scripts/mail-queue.mjs --listBatches
//   node scripts/mail-queue.mjs --reconcile
//   node scripts/mail-queue.mjs --detail uuid,...           # chain tree + full row dump
//   node scripts/mail-queue.mjs --retry uuid,... --provider resend|gmail|alicloud
//
// uuid args accept 8-char short prefix.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

let _supabase
const supabase = new Proxy({}, {
  get(_t, prop) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
    return _supabase[prop].bind(_supabase)
  },
})

const ALICLOUD_DAILY_CAP = 100
const VALID_PROVIDERS = ['alicloud', 'resend', 'gmail']

// ─── arg parsing ────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const arg = (name) => {
  const i = args.indexOf(name)
  const v = i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null
  return v ? v.trim() : null
}
const argList = (name) => {
  const v = arg(name)
  return v ? v.split(',').map(s => s.trim()).filter(Boolean) : null
}

// ─── formatting helpers ─────────────────────────────────────────────────────
function displayWidth(s) {
  let w = 0
  for (const ch of s) w += ch.codePointAt(0) > 0x2E7F ? 2 : 1
  return w
}
function pad(str, len) {
  const s = String(str ?? '')
  const w = displayWidth(s)
  return w >= len ? s : s + ' '.repeat(len - w)
}
function fmtDate(iso) {
  return iso ? iso.replace('T', ' ').slice(0, 19) : '—'
}
function shortId(id) {
  return id ? id.slice(0, 8) : '—'
}

const MAIL_TYPE_LABEL = {
  approval:             '錄取通知',
  student_id:           '學號分配通知',
  timetable_notify:     '課表發佈通知',
  formal_notification:  '正式學員通知',
  attendance_notify:    '出席通知',
}
const fmtMailType = (t) => MAIL_TYPE_LABEL[t] ?? t ?? '—'

function statusColor(s) {
  const colors = {
    sent: '\x1b[32m', delivered: '\x1b[32m',
    pending: '\x1b[33m', processing: '\x1b[33m',
    failed: '\x1b[31m', bounced: '\x1b[31m',
  }
  return (colors[s] ?? '') + s + '\x1b[0m'
}

// ─── id prefix resolution ───────────────────────────────────────────────────
async function resolveIds(inputs, tbl = 'email_queue') {
  const full = inputs.filter(s => s.length === 36)
  const prefixes = inputs.filter(s => s.length < 36)
  let resolved = [...full]
  if (prefixes.length) {
    const { data: ids, error } = await supabase.rpc('find_ids_by_prefix', { prefixes, tbl })
    if (error) { console.error('Prefix lookup failed:', error.message); process.exit(1) }
    resolved.push(...(ids ?? []))
  }
  return resolved
}

// ─── --list ─────────────────────────────────────────────────────────────────
async function listRows() {
  const limit = Number(arg('--limit')) || 200
  let query = supabase
    .from('email_queue')
    .select('id, to_email, mail_type, provider, status, attempt_count, created_at, error, parent_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  const tos = argList('--to')
  if (tos) query = query.in('to_email', tos)
  const statuses = argList('--status')
  if (statuses) query = query.in('status', statuses)
  const providers = argList('--provider')
  if (providers) query = query.in('provider', providers)
  const batches = argList('--batch')
  if (batches) {
    const ids = await resolveIds(batches, 'email_batches')
    query = query.in('batch_id', ids)
  }
  const hours = arg('--hours')
  if (hours) {
    const since = new Date(Date.now() - Number(hours) * 3600_000).toISOString()
    query = query.gte('created_at', since)
  }

  const { data, error } = await query
  if (error) { console.error('Error:', error.message); process.exit(1) }
  if (!data?.length) { console.log('No rows found.'); return }
  printTable(data)
}

function printTable(rows) {
  const childrenOf = {}
  const parents = []
  for (const r of rows) {
    if (r.parent_id) {
      if (!childrenOf[r.parent_id]) childrenOf[r.parent_id] = []
      childrenOf[r.parent_id].push(r)
    } else {
      parents.push(r)
    }
  }

  console.log(pad('id', 9), pad('created_at', 20), pad('to_email', 24), pad('mail_type', 14), pad('provider', 10), 'status')
  console.log('-'.repeat(108))

  for (const r of parents) {
    console.log(
      pad(shortId(r.id), 9),
      pad(fmtDate(r.created_at), 20),
      pad(r.to_email, 24),
      pad(fmtMailType(r.mail_type), 14),
      pad(r.provider, 10),
      statusColor(r.status),
      r.error ? r.error.slice(0, 50) : ''
    )
    const children = childrenOf[r.id] ?? []
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      const branch = i < children.length - 1 ? '├─' : '└─'
      console.log(
        ' '.repeat(9 - branch.length) + branch,
        pad(fmtDate(c.created_at), 20),
        pad(c.to_email, 24),
        pad(fmtMailType(c.mail_type), 14),
        pad(c.provider, 10),
        statusColor(c.status),
        c.error ? c.error.slice(0, 50) : ''
      )
    }
  }
}

// ─── --listBatches ──────────────────────────────────────────────────────────
async function listBatches() {
  const { data, error } = await supabase
    .from('email_batches')
    .select('id, triggered_from, recipient_count, created_at, description')
    .order('created_at', { ascending: false })
  if (error) { console.error('Error:', error.message); process.exit(1) }
  if (!data?.length) { console.log('No batches found.'); return }

  console.log(pad('id', 9), pad('created_at', 20), pad('triggered_from', 35), pad('count', 6), 'description')
  console.log('-'.repeat(100))
  for (const b of data) {
    console.log(pad(shortId(b.id), 9), pad(fmtDate(b.created_at), 20), pad(b.triggered_from ?? '—', 35), pad(b.recipient_count, 6), b.description ?? '')
  }
}

// ─── --validateBatch ────────────────────────────────────────────────────────
async function validateBatch(inputs) {
  const ids = await resolveIds(inputs, 'email_batches')
  if (!ids.length) { console.log('No matching batches.'); return }

  for (const batchId of ids) {
    const { data: batch, error: batchErr } = await supabase
      .from('email_batches')
      .select('id, triggered_from, recipient_count, recipients, created_at')
      .eq('id', batchId)
      .maybeSingle()
    if (batchErr || !batch) { console.error(`Batch ${batchId} not found`); continue }

    const { data: qrows, error: qErr } = await supabase
      .from('email_queue')
      .select('id, to_email, status, provider, attempt_count, parent_id')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
    if (qErr) { console.error('Query failed:', qErr.message); continue }

    const expected = batch.recipients ?? []
    const expectedSet = new Set(expected.map(e => e.toLowerCase()))

    // Only original rows (no retries) count as "present" — retries have parent_id set
    const origRows = (qrows ?? []).filter(r => !r.parent_id)
    const foundSet = new Set(origRows.map(r => r.to_email.toLowerCase()))

    const missing = expected.filter(e => !foundSet.has(e.toLowerCase()))
    const orphans = origRows.filter(r => !expectedSet.has(r.to_email.toLowerCase()))

    console.log('\n' + '═'.repeat(80))
    console.log(`Batch ${shortId(batch.id)}  ${fmtDate(batch.created_at)}  ${batch.triggered_from ?? '—'}`)
    console.log('─'.repeat(80))
    console.log(`  Expected (recipients[]):  ${expected.length}`)
    console.log(`  recipient_count field:    ${batch.recipient_count}`)
    console.log(`  Queue rows (originals):   ${origRows.length}`)
    console.log(`  Queue rows (all incl. retries): ${(qrows ?? []).length}`)
    console.log()

    if (!expected.length) {
      console.log('  ⚠️  recipients[] is empty — batch was created before this column was added.')
      console.log(`  Queue rows present: ${origRows.length}`)
    } else if (missing.length === 0 && orphans.length === 0) {
      console.log('  ✓ All recipients accounted for. No missing or orphan rows.')
    } else {
      if (missing.length) {
        console.log(`  Missing (${missing.length}) — in recipients[] but no queue row:`)
        for (const e of missing) console.log(`    ${e}`)
      }
      if (orphans.length) {
        console.log(`  Orphan rows (${orphans.length}) — in queue but not in recipients[]:`)
        for (const r of orphans) console.log(`    ${r.id.slice(0, 8)}  ${r.to_email}  ${statusColor(r.status)}`)
      }
    }
  }
}

// ─── --detail ───────────────────────────────────────────────────────────────
async function showDetail(inputs) {
  const ids = await resolveIds(inputs)
  if (!ids.length) { console.log('No rows match.'); return }

  for (const id of ids) {
    const { data: self } = await supabase
      .from('email_queue')
      .select('id, parent_id')
      .eq('id', id)
      .maybeSingle()
    if (!self) { console.log(`\n[${id}] not found`); continue }
    const rootId = self.parent_id ?? id

    const { data: rows, error } = await supabase
      .from('email_queue')
      .select('*')
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .order('created_at', { ascending: true })
    if (error) { console.error('Error:', error.message); continue }

    const root = rows.find(r => r.id === rootId) ?? rows[0]
    const children = rows.filter(r => r.id !== root.id)

    console.log('\n' + '═'.repeat(108))
    console.log(`Chain rooted at ${root.id}`)
    console.log('─'.repeat(108))
    console.log(`● root  ${root.id}  ${pad(root.to_email, 24)}  ${pad(root.provider, 8)}  ${statusColor(root.status)}  ${fmtDate(root.created_at)}`)
    for (let i = 0; i < children.length; i++) {
      const r = children[i]
      const branch = i === children.length - 1 ? '└─' : '├─'
      console.log(`${branch}      ${r.id}  ${pad(r.to_email, 24)}  ${pad(r.provider, 8)}  ${statusColor(r.status)}  ${fmtDate(r.created_at)}`)
    }

    // Full dump of requested id (not the whole chain)
    const target = rows.find(r => r.id === id) ?? root
    console.log('─'.repeat(108))
    console.log(`Row dump: ${target.id}`)
    for (const [k, v] of Object.entries(target)) {
      if (v == null) continue
      const val = typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + `… (${v.length} chars)` : v
      console.log(`  ${pad(k, 22)} ${val}`)
    }
  }
}

// ─── --reconcile ────────────────────────────────────────────────────────────
async function reconcile() {
  const { data: rows, error } = await supabase
    .from('email_queue')
    .select('id, provider_message_id, status')
    .eq('provider', 'resend')
    .eq('status', 'sent')
    .not('provider_message_id', 'is', null)
    .limit(100)
  if (error) { console.error('Error:', error.message); process.exit(1) }
  if (!rows?.length) { console.log('No Resend rows in sent state.'); return }

  console.log(`Reconciling ${rows.length} Resend rows...`)
  const STATUS_MAP = { delivered: 'delivered', bounced: 'bounced', failed: 'failed' }
  for (const row of rows) {
    try {
      const res = await fetch(`https://api.resend.com/emails/${row.provider_message_id}`, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      })
      if (!res.ok) { console.warn(`  ${row.id}: Resend API ${res.status}`); continue }
      const data = await res.json()
      const newStatus = STATUS_MAP[data.last_event]
      if (newStatus && newStatus !== row.status) {
        await supabase.from('email_queue').update({ status: newStatus }).eq('id', row.id)
        console.log(`  ${row.id}: ${row.status} → ${newStatus}`)
      }
    } catch (e) {
      console.warn(`  ${row.id}: error —`, e.message)
    }
  }
  console.log('Done.')
}

// ─── --retry ────────────────────────────────────────────────────────────────
function confirm(msg) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(res => {
    rl.question(`${msg} [y/N] `, ans => { rl.close(); res(ans.trim().toLowerCase() === 'y') })
  })
}

async function todayAlicloudCount() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'alicloud')
    .gte('created_at', todayStart.toISOString())
  return count ?? 0
}

async function retry(inputs) {
  const provider = arg('--provider')
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    console.error(`--provider required for --retry. Must be one of: ${VALID_PROVIDERS.join(', ')}`)
    process.exit(1)
  }

  const ids = await resolveIds(inputs)
  if (!ids.length) { console.log('No matching rows.'); return }

  const { data: rows, error } = await supabase
    .from('email_queue')
    .select('id, to_email, subject, html, bcc, mail_type, batch_id, parent_id, attempt_count, status')
    .in('id', ids)
  if (error) { console.error('Query failed:', error.message); process.exit(1) }
  if (!rows?.length) { console.log('No matching rows.'); return }

  if (provider === 'alicloud') {
    const used = await todayAlicloudCount()
    const remaining = ALICLOUD_DAILY_CAP - used
    console.log(`AliCloud daily cap: ${used}/${ALICLOUD_DAILY_CAP} used, ${remaining} remaining`)
    if (rows.length > remaining) {
      console.error(`Cannot retry ${rows.length} rows — only ${remaining} AliCloud sends left today. Aborting.`)
      process.exit(1)
    }
  }

  console.log(`\nWill retry ${rows.length} row(s) via ${provider}:`)
  for (const r of rows) {
    console.log(`  ${r.id}  ${r.to_email}  ${r.mail_type ?? '—'}  status:${r.status}  attempt:${r.attempt_count ?? 1}`)
  }

  const ok = await confirm('\nProceed?')
  if (!ok) { console.log('Aborted.'); return }

  const inserts = rows.map(r => ({
    to_email: r.to_email,
    subject: r.subject,
    html: r.html,
    bcc: r.bcc ?? null,
    status: 'pending',
    provider,
    mail_type: r.mail_type ?? null,
    batch_id: r.batch_id ?? null,
    parent_id: r.parent_id ?? r.id,
    attempt_count: (r.attempt_count ?? 1) + 1,
  }))

  const { data: inserted, error: insertErr } = await supabase
    .from('email_queue')
    .insert(inserts)
    .select('id')
  if (insertErr) { console.error('Insert failed:', insertErr.message); process.exit(1) }

  console.log(`\nInserted ${inserted?.length ?? 0} pending row(s). Cron will send within 1 minute.`)
  for (const r of inserted ?? []) console.log(`  ${r.id}`)
}

// ─── --help ─────────────────────────────────────────────────────────────────
function help() {
  console.log(`mail-queue.mjs — email_queue + email_batches 統一查詢/重送工具

指令（擇一）:
  --help                          顯示此說明
  --list                          列出郵件佇列（可加下方篩選條件）
  --listBatches                   列出所有寄送批次
  --validateBatch uuid,...        驗證批次：比對 recipients[] 與實際 email_queue 紀錄
  --reconcile                     對帳：同步 Resend 已寄送郵件的最新狀態
  --detail uuid,...               顯示郵件鏈樹狀圖與完整欄位內容
  --retry uuid,... --provider P   重新加入佇列以待寄送（P: ${VALID_PROVIDERS.join('|')}）

--list 篩選條件（皆可省略，支援逗號分隔多值）:
  --to email,...                  收件人
  --status failed|sent|pending|bounced|...   狀態
  --provider alicloud|resend|gmail           寄送服務商
  --batch uuid,...                批次 ID
  --hours N                       最近 N 小時內
  --limit N                       筆數上限（預設 200）

uuid 參數可使用 8 字元短前綴。

═══════════════════════════════════════════════════════════════════
退信處理流程（預期件數不多）
═══════════════════════════════════════════════════════════════════

1. 分流 — 找出近期失敗郵件
   node scripts/mail-queue.mjs --list --status failed,bounced --hours 24
   記下左欄短 ID。

2. 對帳 Resend 狀態（抓出隱性退信，原本標記 sent）
   node scripts/mail-queue.mjs --reconcile
   node scripts/mail-queue.mjs --list --provider resend --status bounced

3. 檢查單一失敗郵件
   node scripts/mail-queue.mjs --detail a257f6ef
   顯示鏈（過往重送）+ 完整欄位（subject、html、error、attempt_count）。

4. 依錯誤訊息選擇替代寄送服務商
   - alicloud 被 QQ/163 拒收  → 改用 resend
   - resend 對 gmail.com 退信 → 改用 gmail
   - 軟性錯誤 / 暫時性問題    → 同一服務商可重試

5. 重送
   node scripts/mail-queue.mjs --retry a257f6ef,b3d12c08 --provider resend
   確認提示會顯示收件人與當前狀態。Cron 一分鐘內處理。

6. 確認重送結果
   node scripts/mail-queue.mjs --detail a257f6ef
   鏈會多出子節點，使用新服務商且狀態為 sent/delivered。

批次分流（大量寄送後）
   node scripts/mail-queue.mjs --listBatches
   node scripts/mail-queue.mjs --list --batch <batch-prefix> --status failed
`)
}

// ─── dispatch ───────────────────────────────────────────────────────────────
async function main() {
  if (flag('--help') || args.length === 0) { help(); return }
  if (flag('--reconcile')) { await reconcile(); return }
  if (flag('--listBatches')) { await listBatches(); return }

  const validateBatchIds = argList('--validateBatch')
  if (validateBatchIds) { await validateBatch(validateBatchIds); return }

  const detail = argList('--detail')
  if (detail) { await showDetail(detail); return }

  const retryIds = argList('--retry')
  if (retryIds) { await retry(retryIds); return }

  if (flag('--list')) { await listRows(); return }

  console.error('No command specified. Use --help.')
  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
