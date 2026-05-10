import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

// GET: 所有場次 + 各場次打卡人數統計
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const [sessionsRes, checkinsRes, regsRes] = await Promise.all([
    supabaseAdmin
      .from('course_sessions')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('course_session_checkins')
      .select('session_id, registration_id, status, checked_in_at'),
    supabaseAdmin
      .from('registrations')
      .select('id, chinese_name, student_id, member_id')
      .eq('status', 'approved')
      .eq('retreat_format', 'online'),
  ])

  const sessions = sessionsRes.data || []
  const checkins = checkinsRes.data || []
  const regs = regsRes.data || []

  // per-session stats
  const statsMap = new Map<string, { present: number; absent: number; total: number }>()
  for (const s of sessions) statsMap.set(s.id, { present: 0, absent: 0, total: regs.length })
  for (const c of checkins) {
    const stat = statsMap.get(c.session_id)
    if (stat) {
      if (c.status === 'present') stat.present++
      else if (c.status === 'absent') stat.absent++
    }
  }

  // per-student per-session map for detail view
  const regCheckinMap: Record<string, Record<string, string | null>> = {}
  for (const reg of regs) regCheckinMap[reg.id] = {}
  for (const c of checkins) {
    if (regCheckinMap[c.registration_id]) {
      regCheckinMap[c.registration_id][c.session_id] = c.status
    }
  }

  return NextResponse.json({
    sessions: sessions.map(s => ({ ...s, present: statsMap.get(s.id)?.present ?? 0, absent: statsMap.get(s.id)?.absent ?? 0, total: regs.length })),
    regs,
    checkin_map: regCheckinMap,
  })
}

// PATCH: 切換場次是否需要打卡
export async function PATCH(request: NextRequest) {
  if (checkAuth(request) !== 'admin') return NextResponse.json({ error: '權限不足' }, { status: 403 })
  const { id, requires_checkin } = await request.json()
  const { error } = await supabaseAdmin
    .from('course_sessions')
    .update({ requires_checkin })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
