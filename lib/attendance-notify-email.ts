import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export async function sendAttendanceNotifyEmail(reg: {
  id: string
  email: string
  chinese_name: string
  random_code: string
  member_id: string | null
}) {
  const checkinUrl = `${baseUrl}/member/attendance?id=${reg.id}&code=${reg.random_code}`

  const body = `
    ${emailKicker('Course Attendance')}
    ${emailH1('第二屆台灣四念處禪修・課程簽到通知')}
    <p style="margin:0 0 16px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 20px;color:${C.inkSoft};">
      為統計本屆課程的參課完成情況，並持續優化未來課程安排，現將簽到通知如下：
    </p>

    ${emailH3('課程完成度簽到')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">
      第二屆・台灣四念處禪修之旅簽到表將於 8 月 24 日課程結束後正式開放，並於 8 月 26 日截止填寫。
    </p>
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">
      請全程參與或缺勤不超過 3 次的學員，在截止日期前完成簽到，方可計為一次有效參課記錄。
    </p>
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 20px;">
      缺勤超過 3 次者，本屆課程將不計入參課次數，敬請您知悉。
    </p>

    ${emailButton(checkinUrl, '前往課程簽到表單 →', 'green')}

    <p style="color:${C.inkMute};font-size:13px;margin-top:24px;">
      感恩您的護持，祝您修學進步，法喜充滿。🙏
    </p>
    ${emailSignoff()}
  `

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】課程簽到通知',
    html: emailWrap(body, { maxWidth: 620 }),
  })
}
