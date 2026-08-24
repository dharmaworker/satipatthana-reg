import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchRowsByIds } from '@/lib/supabase'
import { buildFormalNotificationPayload } from '@/lib/formal-notification-email'
import { sendMailBatch } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: '未選取任何筆' }, { status: 400 })
  }

  // 依 id 分批查詢：uuid 全塞進查詢字串會超過長度上限，單次查詢也只回 1000 筆
  let regs: any[]
  let lodgings: any[]
  let inPersonRegs: any[]
  try {
    regs = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('registrations')
      .select('*')
      .in('id', chunk)
      .eq('status', 'approved'))

    inPersonRegs = regs.filter(r => r.retreat_format !== 'online')

    // 每位學員最多一筆食宿登記，故以 id 分批查詢即可
    lodgings = await fetchRowsByIds<any>(inPersonRegs.map(r => r.id), chunk => supabaseAdmin
      .from('lodging_registrations')
      .select('*')
      .in('registration_id', chunk))
  } catch {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const lodgingByReg = new Map<string, any>()
  for (const l of lodgings) lodgingByReg.set(l.registration_id, l)

  const payloads = inPersonRegs.map(reg => buildFormalNotificationPayload({
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
  }))

  try {
    await sendMailBatch(payloads, {
      mailType: 'formal_notification',
      triggeredFrom: '/api/admin/send-formal-notifications',
    })
    return NextResponse.json({
      success: true,
      message: `成功寄出 ${payloads.length} 封（線上學員已略過）`,
    })
  } catch (e: any) {
    console.error('[send-formal-notifications] batch failed:', e)
    return NextResponse.json({ error: e.message || '寄送失敗' }, { status: 500 })
  }
}
