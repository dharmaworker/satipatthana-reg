import { sendMailWithRetry } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailSignoff, emailAlert, emailWarning, tableWrap, tableRow } from './email-style'

const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

type ConvertMail = {
  email: string
  chinese_name: string
  toOnline: boolean          // true = 轉為線上；false = 轉為實體
  newMemberId: string
  newStudentId: string | null
  hadStudentId: boolean      // 轉換前是否已有學號（已錄取）
}

export function buildFormatConversionPayload(m: ConvertMail) {
  const toLabel = m.toOnline ? '線上 Zoom 課程' : '實體禪修課程'
  const fromLabel = m.toOnline ? '實體禪修課程' : '線上 Zoom 課程'

  // 學號說明
  let studentRow = ''
  if (m.toOnline) {
    // 實 → 線：錄取者已自動配發線上學號 C-XXX
    if (m.newStudentId) studentRow = tableRow('學號', m.newStudentId)
  } else {
    // 線 → 實：原線上學號已移除，實體學號由學會另行編配
    if (m.hadStudentId) studentRow = tableRow('學號', '待學會編配')
  }

  const reminders = m.toOnline
    ? `
      <ul style="margin:0;padding-left:20px;color:${C.inkSoft};font-size:13.5px;line-height:1.9;">
        <li>課程方式已改為 <strong style="color:${C.ink};">線上 Zoom 視訊</strong>，相關資訊以「學員專區」網頁顯示為準。</li>
        <li>實體課程的食宿登記、繳費與現場互動報名對線上課程不再適用。</li>
        <li>先前若已收到實體相關通知信，請以此次轉換後的網頁狀態為準。</li>
      </ul>`
    : `
      <ul style="margin:0;padding-left:20px;color:${C.inkSoft};font-size:13.5px;line-height:1.9;">
        <li>課程方式已改為 <strong style="color:${C.ink};">實體禪修課程</strong>，請登入「學員專區」依網頁待辦完成後續事項。</li>
        <li>實體課程之食宿、場地及交通費用需由學員自行負擔；<strong style="color:${C.ink};">繳費事宜將由學會工作人員另行與您聯繫</strong>。</li>
        <li>請自行完成 <strong style="color:${C.ink};">食宿登記</strong> 與 <strong style="color:${C.ink};">互動報名</strong>（若已開放）。</li>
        <li>實體學號將由學會另行編配。</li>
      </ul>`

  const body = `
    ${emailKicker('Format Changed')}
    ${emailH1('課程形式轉換確認')}
    <p style="margin:0 0 16px;color:${C.inkSoft};">${m.chinese_name} 法友您好：</p>
    <p style="margin:0 0 16px;color:${C.inkSoft};">
      您已成功將報名的課程形式由「<strong style="color:${C.ink};">${fromLabel}</strong>」轉換為「<strong style="color:${C.ink};">${toLabel}</strong>」。
      以下為轉換後的最新資料：
    </p>

    ${tableWrap(`
      ${tableRow('課程形式', toLabel)}
      ${tableRow('報名序號', m.newMemberId)}
      ${studentRow}
    `)}

    ${emailH3('轉換後注意事項')}
    ${m.toOnline ? emailAlert(reminders) : emailWarning('轉換為實體課程後，尚有食宿、繳費等事項需完成，請留意以下說明：') + emailAlert(reminders)}

    ${emailSignoff()}
  `

  return {
    to: m.email,
    bcc: archiveEmail,
    subject: `【第二屆台灣四念處禪修】課程形式轉換確認（${m.toOnline ? '改為線上' : '改為實體'}）`,
    html: emailWrap(body, { maxWidth: 600 }),
  }
}

export async function sendFormatConversionEmail(m: ConvertMail) {
  return sendMailWithRetry(buildFormatConversionPayload(m))
}
