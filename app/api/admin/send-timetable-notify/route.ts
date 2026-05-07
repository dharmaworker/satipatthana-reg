import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTimetableNotifyEmail } from '@/lib/timetable-notify-email'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, random_code, member_id')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const results = []
  for (const reg of registrations) {
    try {
      await sendTimetableNotifyEmail(reg)
      results.push({ id: reg.id, success: true })
    } catch {
      results.push({ id: reg.id, success: false })
    }
  }

  const ok = results.filter(r => r.success).length
  return NextResponse.json({
    success: true,
    message: `成功寄出 ${ok} 封，失敗 ${results.length - ok} 封`,
  })
}
