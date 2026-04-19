import { sendMail } from './mailer'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

const TEST_LABELS: Record<string, string> = {
  test_0817_url: '8/17',
  test_0819_url: '8/19',
  test_0820_url: '8/20',
  test_0822_url: '8/22',
}

// 快篩上傳邀請信（隨食宿登記確認信附帶）
export function quickTestsButtonHtml(reg: { id: string; random_code: string }) {
  return `
    <a href="${baseUrl}/quicktests?id=${reg.id}&code=${reg.random_code}"
      style="display:inline-block;background:#1a5276;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
      前往上傳快篩檢測結果
    </a>
    <p style="font-size:13px;color:#666;margin-top:6px;">
      請依下列時間上傳檢測結果（檢測結果需載明日期、學號、姓名；快篩試劑請自備）：<br>
      ・8/17 上午 8:00 至晚上 8:00 前<br>
      ・8/19 上午 12:00 前<br>
      ・8/20 上午 8:00 前<br>
      ・8/22 上午 8:00 前
    </p>
  `
}

// 快篩上傳完成後的確認信（學員 + bcc 學會）
export async function sendQuickTestsConfirmationEmail(reg: {
  email: string
  chinese_name: string
  random_code: string
  member_id?: string | null
}, lodging: any) {
  const uploadedRows = Object.entries(TEST_LABELS).map(([k, label]) => {
    const url = lodging?.[k]
    const status = url ? `✅ 已上傳　<a href="${url}">檢視</a>` : '⏳ 尚未上傳'
    return `<tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;width:100px;">${label}</td><td style="padding:6px 10px;border:1px solid #eee;">${status}</td></tr>`
  }).join('')

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】快篩檢測上傳確認',
    html: `
      <div style="font-family: sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; color: #222;">
        <h2 style="color:#2d6a4f;">快篩上傳已收到 🙏</h2>
        <p>${reg.chinese_name} 法友您好，</p>
        <p>系統已收到您的快篩檢測結果上傳，目前狀態如下：</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">${uploadedRows}</table>
        <p style="margin-top:14px;font-size:13px;color:#c0392b;">
          ⚠️ 尚未上傳的時段請於規定時間前上傳，否則將影響入營或同寢隔離安排。
        </p>
        <p style="font-size:13px;color:#666;">如需重新上傳或補上其他時段，可隨時回到上傳頁。</p>
        <p style="color:#666;font-size:13px;">台灣四念處學會 合十</p>
      </div>
    `,
  })
}
