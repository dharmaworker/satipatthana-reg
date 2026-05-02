import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SESSIONS, TEACHERS, type StatusValue } from '@/lib/interactive'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

const validStatus: StatusValue[] = ['pending', 'won', 'lost']

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  // LEFT JOIN registrations 取需要顯示的欄位
  const { data: regs, error: e1 } = await supabaseAdmin
    .from('registrations')
    .select('id, chinese_name, member_id, student_id, random_code, email, residence, status')
    .eq('status', 'approved')
    .order('member_id', { ascending: true, nullsFirst: false })
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const { data: ints, error: e2 } = await supabaseAdmin
    .from('interactive_registrations')
    .select('*')
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  const intMap = new Map((ints || []).map(i => [i.registration_id, i]))
  const data = (regs || []).map(r => ({
    registration: r,
    interactive: intMap.get(r.id) || null,
  }))

  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { registration_id, group_status, small_status, assigned_session, assigned_group, assigned_date, group_serial, small_serial } = body
  if (!registration_id) return NextResponse.json({ error: '缺少 registration_id' }, { status: 400 })

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (group_status !== undefined) {
    if (!validStatus.includes(group_status)) return NextResponse.json({ error: 'group_status 不合法' }, { status: 400 })
    update.group_status = group_status
  }
  if (small_status !== undefined) {
    if (!validStatus.includes(small_status)) return NextResponse.json({ error: 'small_status 不合法' }, { status: 400 })
    update.small_status = small_status
  }
  if (assigned_session !== undefined) {
    if (assigned_session && !SESSIONS.find(s => s.id === assigned_session)) {
      return NextResponse.json({ error: 'assigned_session 不合法' }, { status: 400 })
    }
    update.assigned_session = assigned_session || null
  }
  if (assigned_group !== undefined) {
    if (assigned_group && !TEACHERS.find(t => t.id === assigned_group)) {
      return NextResponse.json({ error: 'assigned_group 不合法' }, { status: 400 })
    }
    update.assigned_group = assigned_group || null
  }
  if (assigned_date !== undefined) update.assigned_date = assigned_date || null
  if (group_serial !== undefined) {
    if (group_serial !== null && (typeof group_serial !== 'number' || group_serial < -1 || group_serial > 70)) {
      return NextResponse.json({ error: 'group_serial 不合法（-1 ~ 70）' }, { status: 400 })
    }
    update.group_serial = group_serial
  }
  if (small_serial !== undefined) {
    if (small_serial !== null && (typeof small_serial !== 'number' || small_serial < -1 || small_serial > 70)) {
      return NextResponse.json({ error: 'small_serial 不合法（-1 ~ 70）' }, { status: 400 })
    }
    update.small_serial = small_serial
  }

  // #5：禁止 PATCH 對不存在的 row（前端應走學員自行送出建立 row）。先查現況。
  const { data: existing } = await supabaseAdmin
    .from('interactive_registrations')
    .select('group_status, small_status')
    .eq('registration_id', registration_id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: '此學員尚未送出互動報名，無法編輯' }, { status: 404 })
  }

  // 允許「先中簽、後排場次／組別／序號」；notify 端會跳過尚未指定者，不會寄出含「待補」的信。

  const { error } = await supabaseAdmin
    .from('interactive_registrations')
    .update(update)
    .eq('registration_id', registration_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
