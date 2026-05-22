import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildApprovalEmailPayload } from '@/lib/approval-email'
import { sendMailBatch } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  const [{ data: registrations, error }, { data: practiceConfig }] = await Promise.all([
    supabaseAdmin.from('registrations').select('*').in('id', ids).eq('status', 'approved'),
    supabaseAdmin.from('practice_config').select('zoom_meeting_id').eq('id', 1).single(),
  ])

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  if (!practiceConfig?.zoom_meeting_id) {
    return NextResponse.json({ error: '請先在「課前共修管理」設定 Zoom 會議編號再寄信' }, { status: 400 })
  }

  const payloads = registrations.map(reg => buildApprovalEmailPayload(reg))

  try {
    await sendMailBatch(payloads)
    // 批次更新寄信時間
    await supabaseAdmin
      .from('registrations')
      .update({ approval_email_sent_at: new Date().toISOString() })
      .in('id', registrations.map(r => r.id))
    return NextResponse.json({
      success: true,
      message: `成功寄出 ${payloads.length} 封`,
    })
  } catch (e: any) {
    console.error('[send-notifications] batch failed:', e)
    return NextResponse.json({ error: e.message || '寄送失敗' }, { status: 500 })
  }
}
