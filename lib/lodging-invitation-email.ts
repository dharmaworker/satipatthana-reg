import { sendMail } from './mailer'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

const PLAN_LABELS: Record<string, string> = {
  A1: 'A(1) 8/20-8/24 食宿等費用（匯款）',
  A2: 'A(2) 8/20-8/24 食宿等費用（刷卡）',
  B1: 'B(1) 8/19-8/24 食宿費用（匯款）',
  B2: 'B(2) 8/19-8/24 食宿費用（刷卡）',
  C1: 'C(1) 8/19-8/25 食宿等費用（匯款）',
  C2: 'C(2) 8/19-8/25 食宿等費用（刷卡）',
  D1: 'D(1) 8/20-8/25 食宿等費用（匯款）',
  D2: 'D(2) 8/20-8/25 食宿等費用（刷卡）',
  T1: '【測試】匯款 1 元',
  T2: '【測試】刷卡 30 元',
}

// 繳費完成後寄出的「請完成食宿登記」邀請信
export async function sendLodgingInvitationEmail(reg: {
  id: string
  email: string
  chinese_name: string
  random_code: string
  member_id?: string | null
  payment_plan?: string | null
}) {
  const plan = reg.payment_plan || ''
  const planLabel = PLAN_LABELS[plan] || plan || '—'
  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】請完成食宿登記',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #222;">
        <h2 style="color:#2d6a4f;">已收到您的繳費 🙏</h2>
        <p>${reg.chinese_name} 法友您好，</p>
        <p>您已完成繳費，您所選的方案為 <strong>${planLabel}</strong>。</p>
        <p>請繼續完成「食宿登記表」，內容包含緊急聯絡人、飲食、交通安排、證件與機票（國外學員）等資訊：</p>
        <a href="${baseUrl}/lodging?id=${reg.id}&code=${reg.random_code}"
          style="display:inline-block;background:#2d6a4f;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:10px 0;">
          前往食宿登記
        </a>
        <p style="font-size:13px;color:#c0392b;margin-top:6px;">⚠️ 請於 <strong>6 月 20 日晚上 8 點（台北時間）</strong>前完成，逾期系統將拒絕提交。</p>
        <p style="margin-top:20px;color:#666;font-size:13px;">如有疑問，請聯繫台灣四念處學會。</p>
        <p style="color:#666;font-size:13px;">台灣四念處學會 合十</p>
      </div>
    `,
  })
}
