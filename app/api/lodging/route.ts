import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { derivePaymentPlan } from '@/lib/lodging-plan'
import { sendMail } from '@/lib/mailer'

const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

// 由學員用 id + random_code 讀取自己的食宿登記（若已填過）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const code = searchParams.get('code')
  if (!id || !code) {
    return NextResponse.json({ error: '缺少 id 或 code' }, { status: 400 })
  }

  const { data: reg, error: regErr } = await supabaseAdmin
    .from('registrations')
    .select('id, random_code, chinese_name, passport_name, dharma_name, identity, gender, age, email, phone, member_id, status, payment_plan, payment_status')
    .eq('id', id)
    .eq('random_code', code.toUpperCase())
    .single()
  if (regErr || !reg) {
    return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })
  }
  if (reg.status !== 'approved') {
    return NextResponse.json({ error: '尚未錄取，無法填寫食宿登記' }, { status: 403 })
  }

  const { data: lodging } = await supabaseAdmin
    .from('lodging_registrations')
    .select('*')
    .eq('registration_id', reg.id)
    .maybeSingle()

  return NextResponse.json({ registration: reg, lodging: lodging || null })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, ...fields } = body

    if (!id || !code) {
      return NextResponse.json({ error: '缺少 id 或 code' }, { status: 400 })
    }

    const { data: reg, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('id, random_code, chinese_name, email, member_id, status')
      .eq('id', id)
      .eq('random_code', code.toUpperCase())
      .single()
    if (regErr || !reg) {
      return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })
    }
    if (reg.status !== 'approved') {
      return NextResponse.json({ error: '尚未錄取，無法填寫食宿登記' }, { status: 403 })
    }

    // 必填檢查
    const required = [
      'arrival_date', 'departure_date', 'payment_method',
      'emergency_name', 'emergency_relation', 'emergency_phone',
      'arrival_transport', 'departure_transport',
      'diet', 'noon_fasting', 'snacks',
    ]
    for (const k of required) {
      if (!fields[k]) {
        return NextResponse.json({ error: `欄位 ${k} 必填` }, { status: 400 })
      }
    }
    if (!fields.agree_covid_rules) {
      return NextResponse.json({ error: '請勾選同意防疫承諾' }, { status: 400 })
    }
    if (fields.departure_transport === 'bus' && !fields.bus_destination) {
      return NextResponse.json({ error: '選擇專車離開需指定目的地' }, { status: 400 })
    }

    const plan = derivePaymentPlan(
      fields.arrival_date,
      fields.departure_date,
      fields.payment_method
    )
    if (!plan) {
      return NextResponse.json({ error: '日期組合無對應方案，請聯絡學會' }, { status: 400 })
    }

    // upsert 食宿登記
    const { data: lodging, error: lodgingErr } = await supabaseAdmin
      .from('lodging_registrations')
      .upsert({
        registration_id: reg.id,
        arrival_date: fields.arrival_date,
        departure_date: fields.departure_date,
        payment_method: fields.payment_method,
        emergency_name: fields.emergency_name,
        emergency_relation: fields.emergency_relation,
        emergency_phone: fields.emergency_phone,
        arrival_transport: fields.arrival_transport,
        departure_transport: fields.departure_transport,
        bus_destination: fields.bus_destination || null,
        diet: fields.diet,
        noon_fasting: fields.noon_fasting,
        snacks: fields.snacks,
        dinner_0819: !!fields.dinner_0819,
        dinner_0824: !!fields.dinner_0824,
        snoring: !!fields.snoring,
        agree_covid_rules: !!fields.agree_covid_rules,
        id_front_url: fields.id_front_url || null,
        id_back_url: fields.id_back_url || null,
        passport_url: fields.passport_url || null,
        photo_url: fields.photo_url || null,
        arrival_ticket_url: fields.arrival_ticket_url || null,
        departure_ticket_url: fields.departure_ticket_url || null,
        test_0817_url: fields.test_0817_url || null,
        test_0819_url: fields.test_0819_url || null,
        test_0820_url: fields.test_0820_url || null,
        test_0822_url: fields.test_0822_url || null,
        flight_arrival_date: fields.flight_arrival_date || null,
        flight_arrival_time: fields.flight_arrival_time || null,
        flight_departure_date: fields.flight_departure_date || null,
        flight_departure_time: fields.flight_departure_time || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'registration_id' })
      .select()
      .single()
    if (lodgingErr) {
      console.error('[lodging] upsert failed:', lodgingErr)
      return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
    }

    // 同步更新 registrations.payment_plan（由食宿登記帶入）
    await supabaseAdmin
      .from('registrations')
      .update({ payment_plan: plan })
      .eq('id', reg.id)

    // 寄確認信給學員 + bcc 學會（失敗不影響主流程）
    try {
      const dietZh = fields.diet === 'meat' ? '葷食' : '素食'
      const noonZh = fields.noon_fasting === 'before_noon' ? '需要 12 點前吃' : '可以 12 點後吃'
      const arrivalZh = { self: '自行抵達', taipei_bus: '搭主辦專車（8/19 上午 8:30 台北車站）', wuri_bus: '搭主辦專車（8/19 上午 9:30 烏日高鐵）' }[fields.arrival_transport as string] || fields.arrival_transport
      const departureZh = fields.departure_transport === 'self' ? '自行離開' : '乘坐主辦單位專車'
      const busDestZh = {
        taipei_824_pm: '8/24 下午 6:00–6:30 到台北車站',
        taipei_825_am: '8/25 上午 9:00 到台北車站',
        wuri_825_am: '8/25 上午 9:00 到烏日高鐵',
      }[fields.bus_destination as string] || ''

      await sendMail({
        to: reg.email,
        bcc: archiveEmail,
        subject: '【第二屆台灣四念處禪修】食宿登記確認',
        html: `
          <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; color: #222;">
            <h2 style="color:#2d6a4f;">食宿登記確認 🙏</h2>
            <p>${reg.chinese_name} 法友您好，</p>
            <p>您已完成食宿登記。以下為登記摘要：</p>
            <table style="border-collapse:collapse;width:100%;font-size:14px;">
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;width:140px;">學號</td><td style="padding:6px 10px;border:1px solid #eee;">${reg.member_id || '待編號'}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">入住日</td><td style="padding:6px 10px;border:1px solid #eee;">${fields.arrival_date}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">離開日</td><td style="padding:6px 10px;border:1px solid #eee;">${fields.departure_date}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">方案</td><td style="padding:6px 10px;border:1px solid #eee;">${plan}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">前往方式</td><td style="padding:6px 10px;border:1px solid #eee;">${arrivalZh}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">離開方式</td><td style="padding:6px 10px;border:1px solid #eee;">${departureZh}${busDestZh ? '：' + busDestZh : ''}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">飲食</td><td style="padding:6px 10px;border:1px solid #eee;">${dietZh}　${noonZh}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">茶點</td><td style="padding:6px 10px;border:1px solid #eee;">${fields.snacks === 'snacks_and_drink' ? '需要茶點 + 咖啡/茶' : '只需咖啡/茶'}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">8/19 晚餐</td><td style="padding:6px 10px;border:1px solid #eee;">${fields.dinner_0819 ? '是' : '否'}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">8/24 晚餐</td><td style="padding:6px 10px;border:1px solid #eee;">${fields.dinner_0824 ? '是' : '否'}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">睡覺會打鼾</td><td style="padding:6px 10px;border:1px solid #eee;">${fields.snoring ? '會' : '不會'}</td></tr>
              <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">緊急聯絡人</td><td style="padding:6px 10px;border:1px solid #eee;">${fields.emergency_name}（${fields.emergency_relation}）${fields.emergency_phone}</td></tr>
            </table>
            <p style="margin-top:16px;">食宿登記完成後，請繼續完成繳費；系統已依您的選擇自動帶入方案 <strong>${plan}</strong>。</p>
            <p style="color:#666;font-size:13px;margin-top:16px;">台灣四念處學會 合十</p>
          </div>
        `,
      })
    } catch (mailErr) {
      console.error('[lodging] 確認信寄送失敗:', mailErr)
    }

    return NextResponse.json({ success: true, lodging, payment_plan: plan })
  } catch (err: any) {
    console.error('[lodging] error:', err)
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  }
}
