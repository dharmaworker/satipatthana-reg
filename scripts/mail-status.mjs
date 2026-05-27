#!/usr/bin/env node
// mail-status.mjs — query email_queue + email_batches
//
// Usage:
//   node scripts/mail-status.mjs --hours 24
//   node scripts/mail-status.mjs --to user@qq.com
//   node scripts/mail-status.mjs --status failed --hours 168
//   node scripts/mail-status.mjs --provider resend --status bounced
//   node scripts/mail-status.mjs --batches --hours 168
//   node scripts/mail-status.mjs --batch <uuid>
//   node scripts/mail-status.mjs --chain <uuid>
//   node scripts/mail-status.mjs --reconcile

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i !== -1
}
const arg = (name) => {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] ? args[i + 1] : null
}

function pad(str, len) {
  const s = String(str ?? '')
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return iso.replace('T', ' ').slice(0, 19)
}

function statusColor(s) {
  const colors = {
    sent: '\x1b[32m',
    delivered: '\x1b[32m',
    pending: '\x1b[33m',
    processing: '\x1b[33m',
    failed: '\x1b[31m',
    bounced: '\x1b[31m',
  }
  const reset = '\x1b[0m'
  return (colors[s] ?? '') + s + reset
}

// --chain <uuid>
async function showChain(id) {
  // Resolve root: if id is a child, follow parent_id up
  const { data: self } = await supabase
    .from('email_queue')
    .select('id, parent_id')
    .eq('id', id)
    .maybeSingle()
  const rootId = self?.parent_id ?? id

  const { data: rows, error } = await supabase
    .from('email_queue')
    .select('id, to_email, provider, status, created_at, parent_id, attempt_count, mail_type')
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
    .order('created_at', { ascending: true })
  if (error) { console.error('Error:', error.message); process.exit(1) }
  printChain(rootId, rows ?? [])
}

function printChain(rootId, rows) {
  const root = rows.find(r => r.id === rootId) ?? rows[0]
  const children = rows.filter(r => r.id !== root?.id)
  if (!root) { console.log('No rows found.'); return }
  console.log(`● root  ${root.id}  ${pad(root.to_email, 22)}  ${pad(root.provider, 8)}  ${pad(root.status, 10)}  ${fmtDate(root.created_at)}`)
  for (let i = 0; i < children.length; i++) {
    const r = children[i]
    const branch = i === children.length - 1 ? '└─' : '├─'
    console.log(`${branch}      ${r.id}  ${pad(r.to_email, 22)}  ${pad(r.provider, 8)}  ${pad(r.status, 10)}  ${fmtDate(r.created_at)}`)
  }
}

// --batches
async function showBatches(hours) {
  let query = supabase
    .from('email_batches')
    .select('id, triggered_from, recipient_count, created_at, description')
    .order('created_at', { ascending: false })
    .limit(50)
  if (hours) {
    const since = new Date(Date.now() - hours * 3600_000).toISOString()
    query = query.gte('created_at', since)
  }
  const { data, error } = await query
  if (error) { console.error('Error:', error.message); process.exit(1) }
  if (!data?.length) { console.log('No batches found.'); return }

  console.log(pad('created_at', 20), pad('triggered_from', 35), pad('count', 6), 'description')
  console.log('-'.repeat(90))
  for (const b of data) {
    console.log(pad(fmtDate(b.created_at), 20), pad(b.triggered_from ?? '—', 35), pad(b.recipient_count, 6), b.description ?? '')
  }
}

// --batch <uuid>
async function showBatch(batchId) {
  const { data: rows, error } = await supabase
    .from('email_queue')
    .select('id, to_email, mail_type, provider, status, attempt_count, created_at, error, parent_id')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })
  if (error) { console.error('Error:', error.message); process.exit(1) }
  if (!rows?.length) { console.log('No rows found for batch', batchId); return }

  const counts = {}
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1
  console.log(`Batch ${batchId} — ${rows.length} rows`)
  console.log('Summary:', Object.entries(counts).map(([k, v]) => `${k}:${v}`).join('  '))
  console.log('-'.repeat(110))
  printTable(rows)
}

// --reconcile
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

function printTable(rows) {
  // Count children per root
  const childCount = {}
  for (const r of rows) {
    if (r.parent_id) childCount[r.parent_id] = (childCount[r.parent_id] ?? 0) + 1
  }

  console.log(pad('created_at', 20), pad('to_email', 24), pad('mail_type', 18), pad('provider', 10), pad('status', 11), pad('att', 4), 'error')
  console.log('-'.repeat(110))
  for (const r of rows) {
    const retryTag = childCount[r.id] ? ` ↳${childCount[r.id]}` : ''
    const statusStr = statusColor(r.status) + retryTag
    console.log(
      pad(fmtDate(r.created_at), 20),
      pad(r.to_email, 24),
      pad(r.mail_type ?? '—', 18),
      pad(r.provider, 10),
      statusStr,
      pad(r.attempt_count ?? 1, 4),
      r.error ? r.error.slice(0, 50) : ''
    )
  }
}

async function main() {
  if (flag('--reconcile')) { await reconcile(); return }
  if (flag('--batches')) { await showBatches(arg('--hours') ? Number(arg('--hours')) : null); return }
  const batchId = arg('--batch')
  if (batchId) { await showBatch(batchId); return }
  const chainId = arg('--chain')
  if (chainId) { await showChain(chainId); return }

  // Default: list rows
  let query = supabase
    .from('email_queue')
    .select('id, to_email, mail_type, provider, status, attempt_count, created_at, error, parent_id')
    .order('created_at', { ascending: false })
    .limit(200)

  const hours = arg('--hours')
  if (hours) {
    const since = new Date(Date.now() - Number(hours) * 3600_000).toISOString()
    query = query.gte('created_at', since)
  }
  const to = arg('--to')
  if (to) query = query.eq('to_email', to)
  const status = arg('--status')
  if (status) query = query.eq('status', status)
  const provider = arg('--provider')
  if (provider) query = query.eq('provider', provider)

  const { data, error } = await query
  if (error) { console.error('Error:', error.message); process.exit(1) }
  if (!data?.length) { console.log('No rows found.'); return }
  printTable(data)
}

main().catch(e => { console.error(e); process.exit(1) })
