import { sendMail } from './mailer'

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

export async function sendLodgingArchiveEmail(reg: {
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

  return sendMail({
    to: archiveEmail,
    subject: `【食宿登記備存】${reg.chinese_name} / ${plan || '?'}`,
    html: `
      <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; color: #222;">
        <h2 style="color:#2d6a4f;">新食宿登記</h2>
        <p style="color:#666;">本信由系統自動寄出，供學會信箱備份用。最新資料以後台為準。</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:12px;">
          ${row('繳費碼', reg.random_code)}
          ${row('中文姓名', reg.chinese_name)}
          ${row('Email', reg.email)}
          ${row('手機', reg.phone)}
          ${row('學號', reg.member_id)}
          ${row('選擇方案', planLabel)}
          ${row('金額 (NT$)', typeof amount === 'number' ? amount.toLocaleString() : amount)}
          ${row('繳費方式', method)}
          ${row('繳費狀態', statusText)}
          ${row('繳費備註', reg.payment_note)}
          ${row('確認時間', reg.payment_confirmed_at ? new Date(reg.payment_confirmed_at).toLocaleString('zh-TW') : null)}
        </table>
      </div>
    `,
  })
}
