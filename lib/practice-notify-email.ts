import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

type PracticeReg = { id: string; email: string; chinese_name: string; random_code: string; member_id: string | null; retreat_format?: string | null }

export async function buildPracticeNotifyPayload(reg: PracticeReg) {
  // 獲取課前共修配置
  const { supabaseAdmin } = await import('./supabase')
  const { data: practiceConfig } = await supabaseAdmin
    .from('practice_config')
    .select('*')
    .eq('id', 1)
    .single()

  const practiceUrl = `${baseUrl}/member/practice?id=${reg.id}&code=${reg.random_code}`
  const zoomGuideUrl = `${baseUrl}/info/zoom-guide?id=${reg.id}&code=${reg.random_code}`
  const dashboardUrl = `${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`

  const body = `
    ${emailKicker('Pre-Retreat Practice')}
    ${emailH1('課前共修通知')}
    <p style="margin:0 0 16px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 20px;color:${C.inkSoft};">
      課前共修將於本週展開，透過共修深入理解隆波帕默尊者的教導，並為五日禪修做準備。
    </p>

    ${emailH3('課前共修時段')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">
      ${practiceConfig?.period_label || '詳見學員專區'}
    </p>
    ${emailButton(practiceUrl, '前往課前共修 →', 'green')}

    <hr style="border:none;border-top:1px solid #e8e0d4;margin:20px 0;" />
    ${emailH3('Zoom 課前共修連線資訊')}
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin:0 0 18px;background:rgba(216,194,154,0.1);border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;color:${C.ink};font-weight:700;width:80px;">會議編號</td>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;color:${C.ink};font-family:monospace;letter-spacing:0.08em;">${practiceConfig?.zoom_meeting_id || '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;color:${C.ink};font-weight:700;">密碼</td>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;color:${C.ink};font-family:monospace;">${practiceConfig?.zoom_password || '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;color:${C.ink};font-weight:700;">登錄名</td>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;color:${C.inkSoft};">報名序號 + 英文姓名／姓名拼音</td>
      </tr>
    </table>

    ${practiceConfig?.zoom_url ? `${emailButton(practiceConfig.zoom_url, '點此加入 Zoom →', 'green')}` : ''}

    <hr style="border:none;border-top:1px solid #e8e0d4;margin:20px 0;" />
    ${emailH3('Zoom 使用指南')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">
      初次使用 Zoom 請先完成下載與安裝，建議提前 10 分鐘進入確認音視訊設定。
    </p>
    ${emailButton(zoomGuideUrl, '查看 Zoom 使用指南 →', 'gold')}

    <p style="font-size:13.5px;color:${C.inkSoft};margin:16px 0 14px;">或從學員專區進入：</p>
    ${emailButton(dashboardUrl, '進入學員專區 →', 'gold')}

    <p style="color:${C.inkMute};font-size:13px;margin-top:18px;">如有任何問題請聯絡學會。</p>
    ${emailSignoff()}
  `

  return { to: reg.email, bcc: archiveEmail, subject: '【第二屆台灣四念處禪修】課前共修通知', html: emailWrap(body, { maxWidth: 620 }) }
}

export async function sendPracticeNotifyEmail(reg: PracticeReg) {
  return sendMail(await buildPracticeNotifyPayload(reg))
}
