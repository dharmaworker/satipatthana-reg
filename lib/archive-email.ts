import { sendMail } from './mailer'
import { supabaseAdmin } from './supabase'

const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

const PLAN_LABELS: Record<string, string> = {
  A1: 'A(1) 8/20-8/24 食宿等費用（匯款）',
  A2: 'A(2) 8/20-8/24 食宿等費用（刷卡）',
  B1: 'B(1) 8/19-8/24 食宿費用（匯款）',
  B2: 'B(2) 8/19-8/24 食宿費用（刷卡）',
  C1: 'C(1) 8/19+8/25 食宿等費用（匯款）',
  C2: 'C(2) 8/19+8/25 食宿等費用（刷卡）',
  D1: 'D(1) 8/20-8/25 食宿等費用（匯款）',
  D2: 'D(2) 8/20-8/25 食宿等費用（刷卡）',
  T1: '【測試】匯款 1 元',
  T2: '【測試】刷卡 30 元',
}
const PLAN_AMOUNTS: Record<string, number> = {
  A1: 18600, A2: 19300, B1: 20350, B2: 21050,
  C1: 22590, C2: 23290, D1: 20840, D2: 21540,
  T1: 1, T2: 30,
}

const row = (label: string, value: string | number | null | undefined) =>
  `<tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;width:120px;">${label}</td><td style="padding:6px 10px;border:1px solid #eee;">${value ?? '—'}</td></tr>`

const TRANSPORT_ZH: Record<string, string> = {
  self: '8/19 自行抵達',
  taipei_bus: '主辦專車（8/19 台北車站）',
  wuri_bus: '主辦專車（8/19 烏日高鐵）',
  airport_bus_0819: '主辦專車（8/19 桃園機場）',
  self_0820: '8/20 自行抵達',
  bus: '主辦專車',
}
const BUS_DEST_ZH: Record<string, string> = {
  taipei_824_pm: '8/24 下午 6:00–6:30 到台北車站',
  taipei_825_am: '8/25 上午 9 點到台北車站',
  wuri_825_am: '8/25 上午 9 點到烏日高鐵',
  taoyuan_824_pm: '8/24 下午 6:00–6:30 到桃園機場',
  taoyuan_825_am: '8/25 上午 9 點到桃園機場',
}

function lodgingTableRows(l: any): string {
  if (!l) return row('食宿登記狀態', '尚未填寫')
  const parts = [
    row('入住／離開', `${l.arrival_date} ／ ${l.departure_date}`),
    row('繳費方式', l.payment_method === 'transfer' ? '匯款' : '刷卡'),
    row('前往方式', TRANSPORT_ZH[l.arrival_transport] || l.arrival_transport),
    row('離開方式', `${TRANSPORT_ZH[l.departure_transport] || l.departure_transport}${l.bus_destination ? '（' + (BUS_DEST_ZH[l.bus_destination] || l.bus_destination) + '）' : ''}`),
    row('飲食', `${l.diet === 'meat' ? '葷食' : '素食'}　${l.noon_fasting === 'before_noon' ? '12 前吃' : '12 後吃'}`),
    row('茶點', l.snacks === 'snacks_and_drink' ? '茶點 + 咖啡/茶' : '只咖啡/茶'),
    row('8/19 晚餐', l.dinner_0819 ? '是' : '否'),
    row('8/24 晚餐', l.dinner_0824 ? '是' : '否'),
    row('打鼾', l.snoring ? '會' : '不會'),
    row('緊急聯絡人', `${l.emergency_name}（${l.emergency_relation}）${l.emergency_phone}`),
  ]
  return parts.join('')
}

export async function sendLodgingArchiveEmail(reg: {
  id?: string
  random_code: string
  chinese_name: string
  email: string
  phone?: string | null
  member_id?: string | null
  payment_plan?: string | null
  payment_status?: string | null
  payment_note?: string | null
  payment_confirmed_at?: string | null
}) {
  const plan = reg.payment_plan || ''
  const planLabel = PLAN_LABELS[plan] || plan || '—'
  const amount = PLAN_AMOUNTS[plan] ?? '—'
  const method = plan.endsWith('1') ? '匯款' : plan.endsWith('2') ? '刷卡' : '—'
  const statusZh: Record<string, string> = {
    unpaid: '尚未繳費', paid: '已回報待確認', verified: '已確認繳費',
  }
  const statusText = reg.payment_status ? (statusZh[reg.payment_status] || reg.payment_status) : '—'

  // 若有 id，附帶 lodging 詳細資料
  let lodging: any = null
  if (reg.id) {
    const { data } = await supabaseAdmin
      .from('lodging_registrations')
      .select('*')
      .eq('registration_id', reg.id)
      .maybeSingle()
    lodging = data
  }

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: `【第二屆台灣四念處禪修】食宿登記確認`,
    html: `
      <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; color: #222;">
        <h2 style="color:#2d6a4f;">食宿登記確認 🙏</h2>
        <p>${reg.chinese_name} 法友您好，</p>
        <p>我們已收到您的食宿登記，以下是您目前選擇的方案與繳費資訊：</p>
        <h3 style="color:#2d6a4f;font-size:15px;margin-top:14px;">繳費資訊</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          ${row('繳費碼', reg.random_code)}
          ${row('中文姓名', reg.chinese_name)}
          ${row('學號', reg.member_id)}
          ${row('選擇方案', planLabel)}
          ${row('金額 (NT$)', typeof amount === 'number' ? amount.toLocaleString() : amount)}
          ${row('繳費方式', method)}
          ${row('繳費狀態', statusText)}
          ${row('繳費備註', reg.payment_note)}
          ${row('確認時間', reg.payment_confirmed_at ? new Date(reg.payment_confirmed_at).toLocaleString('zh-TW') : null)}
        </table>
        <h3 style="color:#2d6a4f;font-size:15px;margin-top:14px;">食宿登記資料</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          ${lodgingTableRows(lodging)}
        </table>
        <p style="color:#666;font-size:13px;margin-top:16px;">
          如您對方案或繳費資訊有疑問，請聯繫台灣四念處學會。
        </p>
        <p style="color:#666;font-size:13px;">台灣四念處學會 合十</p>
      </div>
    `,
  })
}
