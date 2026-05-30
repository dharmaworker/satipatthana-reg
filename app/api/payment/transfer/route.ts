import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLodgingArchiveEmail } from '@/lib/archive-email'
import { buildPhaseDefsFromConfig, ScheduleConfig } from '@/lib/registration-period'

export async function POST(request: NextRequest) {
  try {
    const { registration_id, plan, last5, transfer_date, account_name } = await request.json()

    if (!registration_id || !last5 || !transfer_date) {
      return NextResponse.json({ error: '請填寫完整資訊' }, { status: 400 })
    }

    if (!/^\d{5}$/.test(last5)) {
      return NextResponse.json({ error: '後五碼請填寫5位數字' }, { status: 400 })
    }

    const { data: reg, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('status, payment_status, registration_phase')
      .eq('id', registration_id)
      .single()

    if (regErr || !reg) {
      return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })
    }
    if (reg.status !== 'approved') {
      return NextResponse.json({ error: '尚未錄取，無法回填匯款' }, { status: 403 })
    }

    // 繳費截止日檢查
    const { data: scData } = await supabaseAdmin.from('site_config').select('value').eq('key', 'schedule_config').maybeSingle()
    const schedCfg = (scData?.value ?? {}) as ScheduleConfig
    const phaseDefs = buildPhaseDefsFromConfig(schedCfg)
    const phase = (reg.registration_phase === 'late' ? 'late' : 'open') as 'open' | 'late'
    const payDeadlineMs = phaseDefs.find(p => p.key === phase)?.payDeadlineMs
    if (payDeadlineMs && Date.now() > payDeadlineMs) {
      return NextResponse.json({ error: '繳費截止日已過，無法再送出' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {
      payment_status: 'paid',
      payment_note: `匯款後五碼：${last5}｜匯款日期：${transfer_date}｜匯款人：${account_name || '未填'}`,
    }
    if (plan) updateData.payment_plan = plan

    const { error } = await supabaseAdmin
      .from('registrations')
      .update(updateData)
      .eq('id', registration_id)

    if (error) throw error

    // 寄食宿備存信給學會信箱（失敗不影響主流程）
    try {
      const { data: fullReg } = await supabaseAdmin
        .from('registrations')
        .select('id, random_code, chinese_name, email, phone, member_id, payment_plan, payment_status, payment_note, payment_confirmed_at')
        .eq('id', registration_id)
        .single()
      if (fullReg) await sendLodgingArchiveEmail(fullReg)
    } catch (mailErr) {
      console.error('[transfer] 食宿備存信失敗:', mailErr)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 })
  }
}