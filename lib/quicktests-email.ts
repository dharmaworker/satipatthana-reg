import { sendMailWithRetry } from './mailer'
import { C, FONT, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailAlert, emailWarning, emailSignoff } from './email-style'
import { getQuicktestDeadline1Ms, getQuicktestDeadline2Ms, msToDayLabel, ScheduleConfig } from './registration-period'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

const TEST_LABELS: Record<string, string> = {
  test_0817_url: '8/17',
  test_0819_url: '8/19',
}

// 快篩上傳邀請信（隨食宿登記確認信附帶）
export function quickTestsButtonHtml(reg: { id: string; random_code: string }, schedCfg?: ScheduleConfig | null) {
  const qt1Label = msToDayLabel(getQuicktestDeadline1Ms(schedCfg))
  const qt2Label = msToDayLabel(getQuicktestDeadline2Ms(schedCfg))
  return `
    ${emailButton(`${baseUrl}/quicktests?id=${reg.id}&code=${reg.random_code}`, '前往上傳快篩檢測結果', 'green')}
    <p style="font-size:13px;color:${C.inkMute};margin-top:8px;line-height:1.85;">
      請依下列時間上傳檢測結果（檢測結果需載明日期、報名序號、姓名；快篩試劑請自備）：<br>
      ・${qt1Label} 上午 8:00 至晚上 8:00 前<br>
      ・${qt2Label} 上午 12:00 前<br>
      （課程期間 8/20、8/22 快篩結果現場繳交，不需線上上傳）
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
    const status = url
      ? `<span style="color:${C.green};font-weight:700;">✓ 已上傳</span>　<a href="${url}" style="color:${C.green};">檢視</a>`
      : `<span style="color:${C.warning};">⏳ 尚未上傳</span>`
    return `<tr><td style="padding:10px 14px;border-bottom:1px dotted ${C.line};color:${C.inkMute};font-size:13px;width:100px;font-weight:600;">${label}</td><td style="padding:10px 14px;border-bottom:1px dotted ${C.line};color:${C.ink};font-size:13.5px;">${status}</td></tr>`
  }).join('')

  const body = `
    ${emailKicker('Rapid Test Upload')}
    ${emailH1('快篩上傳已收到 🙏')}
    <p style="margin:0 0 14px;color:${C.inkSoft};">${reg.chinese_name} 法友您好，</p>
    <p style="margin:0 0 18px;color:${C.inkSoft};">系統已收到您的快篩檢測結果上傳，目前狀態如下：</p>
    <table style="border-collapse:collapse;width:100%;background:${C.bgPure};border:1px solid ${C.line};border-radius:10px;overflow:hidden;">${uploadedRows}</table>
    ${emailWarning('尚未上傳的時段請於規定時間前上傳，否則將影響入營或同寢隔離安排。')}
    <p style="font-size:13px;color:${C.inkMute};margin-top:12px;">如需重新上傳或補上其他時段，可隨時回到上傳頁。</p>
    ${emailSignoff()}
  `

  return sendMailWithRetry({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】快篩檢測上傳確認',
    html: emailWrap(body),
  }, 3, 600, true)
}
