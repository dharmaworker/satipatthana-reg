import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  if (request.cookies.get('admin_role')?.value !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [regsRes, checkinsRes] = await Promise.all([
    supabaseAdmin
      .from('registrations')
      .select('id, chinese_name, member_id, student_id, email, phone')
      .eq('status', 'approved')
      .eq('retreat_format', 'online')
      .order('member_id', { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from('attendance_checkins')
      .select('registration_id, attendance_status, updated_at'),
  ])

  const regs = regsRes.data || []
  const checkinMap = new Map((checkinsRes.data || []).map((c: any) => [c.registration_id, c]))

  const rows = regs.map((reg: any) => {
    const checkin = checkinMap.get(reg.id)
    return {
      registration_id: reg.id,
      chinese_name: reg.chinese_name,
      member_id: reg.member_id,
      student_id: reg.student_id,
      email: reg.email,
      phone: reg.phone,
      attendance_status: checkin?.attendance_status || null,
      submitted_at: checkin?.updated_at || null,
    }
  })

  return NextResponse.json({ rows })
}
