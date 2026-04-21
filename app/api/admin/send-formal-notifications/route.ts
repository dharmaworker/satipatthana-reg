import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendFormalNotificationEmail } from '@/lib/formal-notification-email'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: '未選取任何筆' }, { status: 400 })
  }

  // 撈報名資料＋對應食宿登記
  const { data: regs, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !regs) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const regIds = regs.map(r => r.id)
  const { data: lodgings } = await supabaseAdmin
    .from('lodging_registrations')
    .select('*')
    .in('registration_id', regIds)

  const lodgingByReg = new Map<string, any>()
  for (const l of lodgings || []) lodgingByReg.set(l.registration_id, l)

  let ok = 0, failed = 0
  const results: any[] = []
  for (const reg of regs) {
    try {
      await sendFormalNotificationEmail({
        chinese_name: reg.chinese_name,
        passport_name: reg.passport_name || null,
        member_id: reg.member_id || null,
        student_id: reg.student_id || null,
        random_code: reg.random_code,
        email: reg.email,
        phone: reg.phone,
        residence: reg.residence || null,
        gender: reg.gender || null,
        dharma_name: reg.dharma_name || null,
        payment_plan: reg.payment_plan || null,
        payment_status: reg.payment_status || null,
        lodging: lodgingByReg.get(reg.id) || null,
      })
      ok++
      results.push({ id: reg.id, email: reg.email, success: true })
    } catch (e: any) {
      failed++
      console.error('[formal-notif] failed:', reg.id, e)
      results.push({ id: reg.id, email: reg.email, success: false, error: e.message })
    }
  }

  return NextResponse.json({
    success: true,
    message: `成功寄出 ${ok} 封，失敗 ${failed} 封（僅寄給已錄取且在此批次的學員）`,
    results,
  })
}
