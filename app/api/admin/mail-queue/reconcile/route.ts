import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS_MAP: Record<string, string> = {
  delivered: 'delivered',
  bounced: 'bounced',
  failed: 'failed',
}

const BATCH_SIZE = 8
const BATCH_DELAY_MS = 1100

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { data: rows, error } = await supabaseAdmin
    .from('email_queue')
    .select('id, provider_message_id, status')
    .eq('provider', 'resend')
    .eq('status', 'sent')
    .not('provider_message_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows?.length) return NextResponse.json({ updated: 0, checked: 0 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const updates: { id: string; from: string; to: string }[] = []

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async row => {
        try {
          const res = await fetch(`https://api.resend.com/emails/${row.provider_message_id}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          if (!res.ok) return
          const data = await res.json()
          const newStatus = STATUS_MAP[data.last_event]
          if (newStatus && newStatus !== row.status) {
            await supabaseAdmin.from('email_queue').update({ status: newStatus }).eq('id', row.id)
            updates.push({ id: row.id, from: row.status, to: newStatus })
          }
        } catch {
          // skip individual failures
        }
      })
    )
    if (i + BATCH_SIZE < rows.length) await sleep(BATCH_DELAY_MS)
  }

  return NextResponse.json({ checked: rows.length, updated: updates.length, updates })
}
