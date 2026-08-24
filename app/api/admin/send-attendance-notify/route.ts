import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchRowsByIds } from '@/lib/supabase'
import { buildAttendanceNotifyPayload } from '@/lib/attendance-notify-email'
import { sendMailBatch } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  // 依 id 分批查詢：uuid 全塞進查詢字串會超過長度上限，單次查詢也只回 1000 筆
  let registrations: any[]
  try {
    registrations = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('registrations')
      .select('id, email, chinese_name, random_code, member_id')
      .in('id', chunk)
      .eq('status', 'approved'))
  } catch {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  try {
    await sendMailBatch(registrations.map(reg => buildAttendanceNotifyPayload(reg)), {
      mailType: 'attendance_notify',
      triggeredFrom: '/api/admin/send-attendance-notify',
    })
    return NextResponse.json({
      success: true,
      message: `成功寄出 ${registrations.length} 封`,
    })
  } catch (e: any) {
    console.error('[send-attendance-notify] batch failed:', e)
    return NextResponse.json({ error: e.message || '寄送失敗' }, { status: 500 })
  }
}
