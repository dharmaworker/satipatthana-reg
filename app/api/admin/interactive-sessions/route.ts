import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

// GET /api/admin/interactive-sessions → 全部場次
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('interactive_sessions')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/admin/interactive-sessions → 新增場次
// body: { id, teacher, date, time, cap, waitlist_cap, sort_order? }
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const { id, teacher, date, time, cap, waitlist_cap, sort_order } = body

  if (!id || !teacher || !date || !time || cap === undefined) {
    return NextResponse.json({ error: '缺少必要欄位（id, teacher, date, time, cap）' }, { status: 400 })
  }
  if (typeof cap !== 'number' || cap < 0) return NextResponse.json({ error: 'cap 必須為非負整數' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('interactive_sessions')
    .insert({
      id: String(id).trim(),
      teacher: String(teacher).trim(),
      date: String(date).trim(),
      time: String(time).trim(),
      cap: Number(cap),
      waitlist_cap: Number(waitlist_cap ?? 4),
      sort_order: Number(sort_order ?? 0),
    })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/admin/interactive-sessions → 更新場次
// body: { id, teacher?, date?, time?, cap?, waitlist_cap?, is_active?, sort_order? }
export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const update: Record<string, any> = {}
  if (rest.teacher !== undefined) update.teacher = String(rest.teacher).trim()
  if (rest.date !== undefined) update.date = String(rest.date).trim()
  if (rest.time !== undefined) update.time = String(rest.time).trim()
  if (rest.cap !== undefined) update.cap = Number(rest.cap)
  if (rest.waitlist_cap !== undefined) update.waitlist_cap = Number(rest.waitlist_cap)
  if (rest.is_active !== undefined) update.is_active = Boolean(rest.is_active)
  if (rest.sort_order !== undefined) update.sort_order = Number(rest.sort_order)

  const { error } = await supabaseAdmin.from('interactive_sessions').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/interactive-sessions  body: { id }
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const { id } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('interactive_sessions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
