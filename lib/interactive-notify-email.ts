import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailAlert, emailSignoff } from './email-style'
import { SESSIONS, TEACHER_LABEL, type StatusValue } from './interactive'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export async function sendInteractiveNotificationEmail(opts: {
  registration_id: string
  email: string
  chinese_name: string
  random_code: string
  group_status: StatusValue
  small_status: StatusValue
  assigned_session: string | null
  assigned_group: string | null
  assigned_date: string | null
  group_serial: number | null
  small_serial: number | null
}) {
  const { email, chinese_name, random_code, registration_id,
    group_status, small_status, assigned_session, assigned_group, assigned_date,
    group_serial, small_serial } = opts

  const wonAny = group_status === 'won' || small_status === 'won'
  const serialBadge = (n: number | null | undefined) =>
    (n === null || n === undefined) ? '' :
    `<span style="display:inline-block;background:${C.gold};color:#fff8ee;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:12px;padding:2px 10px;border-radius:999px;letter-spacing:0.04em;margin-left:6px;">序號 ${n}</span>`

  const groupLine = group_status === 'won'
    ? (() => {
        const s = SESSIONS.find(x => x.id === assigned_session)
        const txt = s ? `${s.date} ${s.time}　${s.teacher}` : '（場次待補）'
        return `<strong style="color:${C.green};">✓ 集體互動：中簽</strong>${serialBadge(group_serial)}<br><span style="color:${C.inkSoft};font-size:13px;">場次：${txt}</span>`
      })()
    : group_status === 'lost'
      ? `<span style="color:${C.inkMute};">✗ 集體互動：未中簽</span>`
      : `<span style="color:${C.inkMute};">⏳ 集體互動：未定</span>`

  const smallLine = small_status === 'won'
    ? `<strong style="color:${C.green};">✓ 分組互動：中簽</strong>${serialBadge(small_serial)}<br><span style="color:${C.inkSoft};font-size:13px;">小組：${assigned_group ? TEACHER_LABEL[assigned_group] || assigned_group : '（待補）'} 組　日期：${assigned_date || '（待補）'}</span>`
    : small_status === 'lost'
      ? `<span style="color:${C.inkMute};">✗ 分組互動：未中簽</span>`
      : `<span style="color:${C.inkMute};">⏳ 分組互動：未定</span>`

  const taskLink = `${baseUrl}/member/interactive/task?id=${registration_id}&code=${random_code}`

  const body = `
    ${emailKicker('Interactive Lottery Result')}
    ${emailH1(wonAny ? '互動報名結果通知 🎉' : '互動報名結果通知')}
    <p style="margin:0 0 12px;color:${C.inkSoft};">${chinese_name} 法友您好：</p>
    <p style="margin:0 0 16px;color:${C.inkSoft};">您於互動報名的抽籤結果如下：</p>

    <div style="background:${C.bgPure};border:1px solid ${C.line};border-radius:12px;padding:18px 22px;margin:14px 0;line-height:2;">
      ${groupLine}<br><br>
      ${smallLine}
    </div>

    ${wonAny ? `
      ${emailH3('下一步：填寫互動作業')}
      <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">恭喜您中簽！請於課程開始前填寫互動作業，老師會依您的問題與背景準備指導。</p>
      ${emailButton(taskLink, '前往填寫互動作業', 'green')}
      <p style="margin-top:10px;font-size:12.5px;color:${C.inkMute};">作業內容包含：基本背景、近期實修狀況、希望老師指導的問題（每題 75 字內）。</p>
    ` : `
      ${emailAlert('本次互動名額有限，未能中簽請勿介懷。期望未來有更多機緣與老師互動。')}
    `}

    ${emailSignoff()}
  `

  return sendMail({
    to: email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】互動報名結果通知',
    html: emailWrap(body),
  })
}
