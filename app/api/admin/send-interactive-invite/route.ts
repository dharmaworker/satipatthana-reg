import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendInteractiveInviteEmail } from '@/lib/interactive-invite-email'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: '缺少對象' }, { status: 400 })
  }

  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, random_code, member_id, status')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const results: { id: string; email: string; success: boolean }[] = []
  for (const reg of registrations) {
    try {
      await sendInteractiveInviteEmail(reg)
      results.push({ id: reg.id, email: reg.email, success: true })
    } catch {
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
