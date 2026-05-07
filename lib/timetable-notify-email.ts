import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export async function sendTimetableNotifyEmail(reg: {
  id: string
  email: string
  chinese_name: string
  random_code: string
  member_id: string | null
}) {
  const body = `
    ${emailKicker('Timetable Published')}
    ${emailH1('第二屆台灣四念處禪修・課程時間表已發佈')}
    <p style="margin:0 0 16px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 20px;color:${C.inkSoft};">
      五日禪修（8/20 — 8/24）的完整課程時間表已發佈，請至學員專區查閱。
    </p>

    ${emailH3('課程時間表')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">
      包含每日禪坐、法談、互動時段的完整安排，建議提前了解以便準備。
    </p>
    ${emailButton(`${baseUrl}/info/schedule?id=${reg.id}&code=${reg.random_code}`, '查看課程時間表 →', 'green')}

    <p style="font-size:13.5px;color:${C.inkSoft};margin:16px 0 14px;">或從學員專區進入：</p>
    ${emailButton(`${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`, '進入學員專區', 'gold')}

    <p style="color:${C.inkMute};font-size:13px;margin-top:18px;">如有任何問題請聯絡學會。</p>
    ${emailSignoff()}
  `

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】課程時間表已發佈',
    html: emailWrap(body, { maxWidth: 620 }),
  })
}
