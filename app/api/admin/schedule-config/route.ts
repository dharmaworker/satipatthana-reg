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

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()

  const { error } = await supabaseAdmin
    .from('site_config')
    .upsert(
      { key: KEY, value: body, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
