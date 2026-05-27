import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  const role = req.cookies.get('admin_role')?.value
  return role === 'admin' || role === 'practice_editor'
}

// GET /api/admin/practice — 返回 config + 所有 items（含 disabled）
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [configRes, scheduleRes] = await Promise.all([
    supabaseAdmin.from('practice_config').select('*').eq('id', 1).single(),
    supabaseAdmin.from('practice_schedule').select('*').order('sort_order'),
  ])

  return NextResponse.json({
    config: configRes.data || null,
    items: scheduleRes.data || [],
  })
}

// PATCH /api/admin/practice — 更新 config 或 item
// body: { type: 'config', data: {...} } | { type: 'item', id, data: {...} } | { type: 'delete_item', id } | { type: 'add_item', data: {...} }
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()

  if (body.type === 'config') {
    const { error } = await supabaseAdmin
      .from('practice_config')
      .update({ ...body.data, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'item') {
    const { id: _id, ...itemData } = body.data
    const { error } = await supabaseAdmin
      .from('practice_schedule')
      .update(itemData)
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'add_item') {
    const { error } = await supabaseAdmin
      .from('practice_schedule')
      .insert(body.data)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'delete_item') {
    const { error } = await supabaseAdmin
      .from('practice_schedule')
      .delete()
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown type' }, { status: 400 })
}
