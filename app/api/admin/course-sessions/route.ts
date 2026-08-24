import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
import { fetchTimetable, saveTimetable } from '@/lib/timetable'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

// GET: 所有場次 + 各場次打卡人數統計
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  // 打卡記錄已破萬筆，必須分頁全撈，否則統計只會算到前 1000 筆
  const [sessionsRes, checkins, regs] = await Promise.all([
    supabaseAdmin
      .from('course_sessions')
      .select('*')
      .order('sort_order', { ascending: true }),
    fetchAllRows<{ session_id: string; registration_id: string; status: string | null; checked_in_at: string | null }>(
      (from, to) => supabaseAdmin
        .from('course_session_checkins')
        .select('session_id, registration_id, status, checked_in_at')
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<{ id: string; chinese_name: string; student_id: string | null; member_id: string | null }>(
      (from, to) => supabaseAdmin
        .from('registrations')
        .select('id, chinese_name, student_id, member_id')
        .eq('status', 'approved')
        .eq('retreat_format', 'online')
        .order('student_id', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .range(from, to),
    ),
  ])

  const sessions = sessionsRes.data || []

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

// POST: 重新同步時間表（清除舊場次、更新內容）
export async function POST(request: NextRequest) {
  if (checkAuth(request) !== 'admin') return NextResponse.json({ error: '權限不足' }, { status: 403 })
  try {
    const timetable = await fetchTimetable()
    await saveTimetable(timetable)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '同步失敗' }, { status: 500 })
  }
}

// DELETE: 強制刪除場次（含打卡記錄）
export async function DELETE(request: NextRequest) {
  if (checkAuth(request) !== 'admin') return NextResponse.json({ error: '權限不足' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  // 先刪打卡記錄，再刪場次
  await supabaseAdmin.from('course_session_checkins').delete().eq('session_id', id)
  const { error } = await supabaseAdmin.from('course_sessions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
