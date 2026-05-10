import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

type TimetableReg = { id: string; email: string; chinese_name: string; random_code: string; member_id: string | null; retreat_format?: string | null }

export function buildTimetableNotifyPayload(reg: TimetableReg) {
  const isOnline = reg.retreat_format === 'online'
  const checkinUrl = `${baseUrl}/member/course-checkin?id=${reg.id}&code=${reg.random_code}`
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

    ${isOnline ? `
    <hr style="border:none;border-top:1px solid #e8e0d4;margin:24px 0;" />
    ${emailH3('課程打卡提醒（線上學員）')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">
      本屆課程設有線上打卡功能，請於每節課程結束後，至學員專區的「課程打卡」記錄出席或缺席。
    </p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin:0 0 18px;background:rgba(216,194,154,0.1);border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;color:${C.inkMute};width:36px;font-size:16px;text-align:center;">📋</td>
        <td style="padding:10px 14px;border:1px solid #e8e0d4;">
          <strong style="color:${C.ink};display:block;margin-bottom:4px;">打卡注意事項</strong>
          <span style="color:${C.inkSoft};">・每個場次僅能修改 <strong style="color:${C.ink};">3 次</strong>，請確認後再送出。</span><br/>
          <span style="color:${C.inkSoft};">・須<strong style="color:${C.ink};">全程出席（零缺席）</strong>方可取得完課資格；有任何缺席記錄將不計入參課。</span>
        </td>
      </tr>
    </table>
    ${emailButton(checkinUrl, '前往課程打卡 →', 'gold')}
    ` : ''}

    <p style="color:${C.inkMute};font-size:13px;margin-top:18px;">如有任何問題請聯絡學會。</p>
    ${emailSignoff()}
  `

  return { to: reg.email, bcc: archiveEmail, subject: '【第二屆台灣四念處禪修】課程時間表已發佈', html: emailWrap(body, { maxWidth: 620 }) }
}

export async function sendTimetableNotifyEmail(reg: TimetableReg) {
  return sendMail(buildTimetableNotifyPayload(reg))
}
