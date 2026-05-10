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

  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
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
