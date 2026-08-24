import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchRowsByIds } from '@/lib/supabase'

const VALID_PROVIDERS = ['alicloud', 'resend', 'gmail'] as const

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const body = await request.json()
  const { ids, provider } = body as { ids: string[]; provider: string }

  if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  if (!VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    return NextResponse.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 400 })
  }

  // 依 id 分批查詢：清單一次最多 500 筆，全串進查詢字串會逼近 URL／header 長度上限
  let rows: any[]
  try {
    rows = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('email_queue')
      .select('id, to_email, subject, html, bcc, mail_type, batch_id, parent_id, attempt_count')
      .in('id', chunk))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
  if (!rows.length) return NextResponse.json({ error: 'No matching rows' }, { status: 404 })

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

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('email_queue')
    .insert(inserts)
    .select('id')

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ inserted: inserted?.length ?? 0, ids: inserted?.map(r => r.id) ?? [] })
}
