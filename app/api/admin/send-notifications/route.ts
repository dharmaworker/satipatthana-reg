import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendApprovalEmail } from '@/lib/approval-email'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  // 取得要寄信的學員
  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const results = []

  for (const reg of registrations) {
    try {
      await sendApprovalEmail(reg)
      results.push({ id: reg.id, email: reg.email, success: true })
    } catch (err) {
      results.push({ id: reg.id, email: reg.email, success: false })
    }
  }

  const successCount = results.filter(r => r.success).length

  return NextResponse.json({
    success: true,
    message: `成功寄出 ${successCount} 封，失敗 ${results.length - successCount} 封`,
    results,
  })
}

