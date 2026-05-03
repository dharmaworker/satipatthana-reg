import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  if (request.cookies.get('admin_role')?.value !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const format = new URL(request.url).searchParams.get('format') || 'in_person'

  const [scheduleRes, regsRes] = await Promise.all([
    supabaseAdmin
      .from('practice_schedule')
      .select('id, sort_order, session_date, time_label, title, is_live')
      .eq('enabled', true)
      .order('sort_order'),
    supabaseAdmin
      .from('registrations')
      .select('id, chinese_name, member_id, student_id, retreat_format')
      .eq('status', 'approved')
      .eq('retreat_format', format)
      .order('member_id', { ascending: true, nullsFirst: false }),
  ])

  if (!regsRes.data || !scheduleRes.data) {
    return NextResponse.json({ items: [], rows: [] })
  }

  const regIds = regsRes.data.map((r: { id: string }) => r.id)

  const { data: checkins } = regIds.length > 0
    ? await supabaseAdmin
        .from('practice_checkins')
        .select('registration_id, schedule_item_id')
        .in('registration_id', regIds)
    : { data: [] }

  const checkinMap: Record<string, Set<string>> = {}
  for (const c of checkins || []) {
    if (!checkinMap[c.registration_id]) checkinMap[c.registration_id] = new Set()
    checkinMap[c.registration_id].add(c.schedule_item_id)
  }

  const rows = regsRes.data.map((r: { id: string; chinese_name: string; member_id: string | null; student_id: string | null; retreat_format: string }) => ({
    registration_id: r.id,
    chinese_name: r.chinese_name,
    member_id: r.member_id,
    student_id: r.student_id,
    checked_count: (checkinMap[r.id]?.size) ?? 0,
    checked_item_ids: [...(checkinMap[r.id] ?? [])],
  }))

  return NextResponse.json({ items: scheduleRes.data, rows })
}
