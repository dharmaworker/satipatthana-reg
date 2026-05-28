#!/usr/bin/env node
// mail-retry.mjs — manually retry failed/bounced email_queue rows
//
// Usage:
//   node scripts/mail-retry.mjs --id <uuid>
//   node scripts/mail-retry.mjs --to user@qq.com
//   node scripts/mail-retry.mjs --hours 24 --status failed
//   node scripts/mail-retry.mjs --batch <batch-uuid> --status failed
//   node scripts/mail-retry.mjs --id <uuid> --provider resend
//   node scripts/mail-retry.mjs --id <uuid> --provider gmail

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALICLOUD_DAILY_CAP = 100

const args = process.argv.slice(2)
const arg = (name) => {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] ? args[i + 1] : null
}

async function confirm(msg) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`${msg} [y/N] `, ans => {
      rl.close()
      resolve(ans.trim().toLowerCase() === 'y')
    })
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

async function main() {
  const statusFilter = arg('--status') ?? null
  // status restriction removed — allow retrying any status (e.g. sent, bounced, failed)
  // if (!['failed', 'bounced'].includes(statusFilter)) {
  //   console.error('--status must be "failed" or "bounced"')
  //   process.exit(1)
  // }

  const provider = arg('--provider') ?? 'alicloud'
  if (!['alicloud', 'resend', 'gmail'].includes(provider)) {
    console.error('--provider must be alicloud, resend, or gmail')
    process.exit(1)
  }

  let query = supabase
    .from('email_queue')
    .select('id, to_email, subject, html, bcc, mail_type, batch_id, parent_id, attempt_count, status')
  if (statusFilter) query = query.in('status', [statusFilter])

  const id = arg('--id')
  const to = arg('--to')
  const hours = arg('--hours')
  const batchId = arg('--batch')

  if (id) {
    // accept short prefix (e.g. first 8 chars) or full UUID
    if (id.length < 36) {
      const { data: ids } = await supabase.rpc('find_ids_by_prefix', { prefixes: [id], tbl: 'email_queue' })
      if (!ids?.length) { console.log('No row found for prefix:', id); return }
      query = query.eq('id', ids[0])
    } else {
      query = query.eq('id', id)
    }
  } else if (to) {
    query = query.eq('to_email', to)
  } else if (batchId) {
    query = query.eq('batch_id', batchId)
  } else if (hours) {
    const since = new Date(Date.now() - Number(hours) * 3600_000).toISOString()
    query = query.gte('created_at', since)
  } else {
    console.error('Provide one of: --id, --to, --batch, or --hours')
    process.exit(1)
  }

  const { data: rows, error } = await query
  if (error) { console.error('Query failed:', error.message); process.exit(1) }
  if (!rows?.length) { console.log('No matching rows found.'); return }

  // AliCloud daily cap check (only relevant for alicloud path)
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

  // Re-insert as new pending rows — cron routes by provider
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
  if (insertErr) {
    console.error('Insert failed:', insertErr.message)
    process.exit(1)
  }

  console.log(`\nInserted ${inserted?.length ?? 0} pending row(s). Cron will send within 1 minute.`)
  for (const r of inserted ?? []) {
    console.log(`  ${r.id}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
