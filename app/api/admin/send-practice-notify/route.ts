import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildPracticeNotifyPayload } from '@/lib/practice-notify-email'
import { sendMailBatch } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, random_code, member_id, retreat_format')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  try {
    const payloads = await Promise.all(registrations.map(reg => buildPracticeNotifyPayload(reg)))
    await sendMailBatch(payloads, {
      mailType: 'practice_notify',
      triggeredFrom: '/api/admin/send-practice-notify',
    })
    return NextResponse.json({
      success: true,
      message: `成功寄出 ${registrations.length} 封`,
    })
  } catch (e: any) {
    console.error('[send-practice-notify] batch failed:', e)
    return NextResponse.json({ error: e.message || '寄送失敗' }, { status: 500 })
  }
}
