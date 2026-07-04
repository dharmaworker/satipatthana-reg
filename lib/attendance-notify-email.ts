import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

type AttendanceReg = { id: string; email: string; chinese_name: string; random_code: string; member_id: string | null }

export function buildAttendanceNotifyPayload(reg: AttendanceReg) {
  const checkinUrl = `${baseUrl}/info/schedule?id=${reg.id}&code=${reg.random_code}`
  const body = `
    ${emailKicker('Course Attendance Reminder')}
    ${emailH1('第二屆台灣四念處禪修・課程打卡提醒')}
    <p style="margin:0 0 16px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 20px;color:${C.inkSoft};">
      今天是本屆課程的最後一天，也是課程打卡的最後機會，請記得完成打卡！
    </p>
    ${emailH3('課程打卡')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">
      請至「課程時間表與打卡」頁面，於標示「需打卡」的場次記錄今日參與課程的出席或缺席狀態。
    </p>
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 20px;">
      打卡紀錄將作為您本屆完課的憑證，請勿遺漏。
    </p>
    ${emailButton(checkinUrl, '前往課程時間表與打卡 →', 'green')}
    <p style="color:${C.inkMute};font-size:13px;margin-top:24px;">
      感恩您的護持，祝您修學進步，法喜充滿。🙏
    </p>
    ${emailSignoff()}
  `
  return { to: reg.email, bcc: archiveEmail, subject: '【第二屆台灣四念處禪修】課程打卡提醒・今天是最後一天', html: emailWrap(body, { maxWidth: 620 }) }
}

export async function sendAttendanceNotifyEmail(reg: AttendanceReg) {
  return sendMail(buildAttendanceNotifyPayload(reg))
}
