import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  if (request.cookies.get('admin_role')?.value !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const format = new URL(request.url).searchParams.get('format') || 'in_person'

  const [scheduleRes, regs] = await Promise.all([
    supabaseAdmin
      .from('practice_schedule')
      .select('id, sort_order, session_date, time_label, title, is_live')
      .eq('enabled', true)
      .order('sort_order'),
    fetchAllRows<{ id: string; chinese_name: string; member_id: string | null; student_id: string | null; retreat_format: string }>(
      (from, to) => supabaseAdmin
        .from('registrations')
        .select('id, chinese_name, member_id, student_id, retreat_format')
        .eq('status', 'approved')
        .eq('retreat_format', format)
        .order('member_id', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .range(from, to),
    ),
  ])

  if (!scheduleRes.data) {
    return NextResponse.json({ items: [], rows: [] })
  }

  const regIdSet = new Set(regs.map(r => r.id))

  // 打卡記錄已破萬筆：分頁全撈再於記憶體過濾。
  // 不用 .in(regIds)——一來單次查詢仍受 1000 筆上限截斷，二來數百組 uuid 會撐爆查詢字串。
  const checkins = regIdSet.size > 0
    ? await fetchAllRows<{ registration_id: string; schedule_item_id: string }>(
        (from, to) => supabaseAdmin
          .from('practice_checkins')
          .select('registration_id, schedule_item_id')
          .eq('checked', true)
          .order('id', { ascending: true })
          .range(from, to),
      )
    : []

  const checkinMap: Record<string, Set<string>> = {}
  for (const c of checkins) {
    if (!regIdSet.has(c.registration_id)) continue
    if (!checkinMap[c.registration_id]) checkinMap[c.registration_id] = new Set()
    checkinMap[c.registration_id].add(c.schedule_item_id)
  }

  const rows = regs.map(r => ({
    registration_id: r.id,
    chinese_name: r.chinese_name,
    member_id: r.member_id,
    student_id: r.student_id,
    checked_count: (checkinMap[r.id]?.size) ?? 0,
    checked_item_ids: [...(checkinMap[r.id] ?? [])],
  }))

  return NextResponse.json({ items: scheduleRes.data, rows })
}
