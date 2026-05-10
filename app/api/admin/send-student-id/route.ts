import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildStudentIdPayload } from '@/lib/student-id-email'
import { sendMailBatch } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, random_code, member_id, student_id')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const noStudentId = registrations.filter(r => !r.student_id)
  if (noStudentId.length > 0) {
    return NextResponse.json({
      error: `以下學員尚未分配學號，請先完成分配再寄信：${noStudentId.map(r => r.chinese_name).join('、')}`,
    }, { status: 400 })
  }

  try {
    await sendMailBatch(registrations.map(reg => buildStudentIdPayload(reg as any)))
    return NextResponse.json({
      success: true,
      message: `成功寄出 ${registrations.length} 封`,
    })
  } catch (e: any) {
    console.error('[send-student-id] batch failed:', e)
    return NextResponse.json({ error: e.message || '寄送失敗' }, { status: 500 })
  }
}
