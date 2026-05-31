import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const KEY = 'schedule_config'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_role')?.value === 'admin'
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('site_config')
    .select('value')
    .eq('key', KEY)
    .maybeSingle()

  return NextResponse.json(data?.value ?? {})
}

const HISTORY_KEY = 'schedule_config_history'

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()

  const [{ data: current }, { data: historyRow }] = await Promise.all([
    supabaseAdmin.from('site_config').select('value').eq('key', KEY).maybeSingle(),
    supabaseAdmin.from('site_config').select('value').eq('key', HISTORY_KEY).maybeSingle(),
  ])

  const history: any[] = Array.isArray(historyRow?.value) ? historyRow.value : []
  history.push({ at: new Date().toISOString(), before: current?.value ?? null, after: body })

  const [{ error }, { error: histErr }] = await Promise.all([
    supabaseAdmin.from('site_config').upsert(
      { key: KEY, value: body, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    ),
    supabaseAdmin.from('site_config').upsert(
      { key: HISTORY_KEY, value: history, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    ),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (histErr) console.error('[schedule-config] history write failed:', histErr.message)
  return NextResponse.json({ ok: true })
}
