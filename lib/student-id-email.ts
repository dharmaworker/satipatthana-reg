import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailCodeBox, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export async function sendStudentIdEmail(reg: {
  id: string
  email: string
  chinese_name: string
  random_code: string
  member_id: string | null
  student_id: string
}) {
  const body = `
    ${emailKicker('Student ID Assignment')}
    ${emailH1('第二屆台灣四念處禪修・學號分配通知')}
    <p style="margin:0 0 16px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 20px;color:${C.inkSoft};">您的禪修學號已完成分配，請妥善記錄以下資訊。</p>

    ${emailH3('您的學員資訊')}
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:20px;">
      <tr>
        <td style="padding:10px 14px;border:1px solid ${C.line};color:${C.inkMute};width:120px;font-weight:600;">報名序號</td>
        <td style="padding:10px 14px;border:1px solid ${C.line};font-weight:700;color:${C.ink};letter-spacing:0.06em;">${reg.member_id || '—'}</td>
      </tr>
      <tr style="background:rgba(73,85,52,0.04);">
        <td style="padding:10px 14px;border:1px solid ${C.line};color:${C.inkMute};font-weight:600;">學號</td>
        <td style="padding:10px 14px;border:1px solid ${C.line};font-weight:700;color:${C.green};font-size:16px;letter-spacing:0.08em;">${reg.student_id}</td>
      </tr>
    </table>

    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">可至學員專區查看您的報名與繳費狀態：</p>
    ${emailButton(`${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`, '進入學員專區', 'green')}

    ${emailCodeBox('您的專屬代碼', reg.random_code, '登入學員專區時需使用此碼')}

    <p style="color:${C.inkMute};font-size:13px;margin-top:18px;">如有任何問題請聯絡學會。</p>
    ${emailSignoff()}
  `

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】學號分配通知',
    html: emailWrap(body, { maxWidth: 620 }),
  })
}
