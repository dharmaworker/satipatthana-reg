import { sendMail, sendMailWithRetry } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailAlert, emailSignoff } from './email-style'
import { type StatusValue } from './interactive'
import { fetchAllSessions, fetchAllSmallSlots, deriveTeachersFromSlots, buildSessionLabelMap, buildTeacherLabelMap } from './interactive-db'
import { fetchInteractiveConfig } from './interactive-config'

function fmtTaipei(ms: number) {
  return new Date(ms).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

const serialBadge = (n: number | null | undefined) =>
  (n === null || n === undefined) ? '' :
  `<span style="display:inline-block;background:${C.gold};color:#fff8ee;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:12px;padding:2px 10px;border-radius:999px;letter-spacing:0.04em;margin-left:6px;">序號 ${n}</span>`

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

  // 從 DB 取得目前最新場次、老師資料與作業截止時間
  const [sessions, slots, config] = await Promise.all([fetchAllSessions(), fetchAllSmallSlots(), fetchInteractiveConfig()])
  const sessionLabelMap = buildSessionLabelMap(sessions)
  const teachers = deriveTeachersFromSlots(slots)
  const teacherLabelMap = buildTeacherLabelMap(teachers)
  const taskOpenLabel = config.task_open_ms ? fmtTaipei(config.task_open_ms) : null
  const taskDeadlineLabel = config.task_deadline_ms ? fmtTaipei(config.task_deadline_ms) : null
  const taskTimeRange = taskOpenLabel && taskDeadlineLabel
    ? `開放 ${taskOpenLabel} ～ 截止 ${taskDeadlineLabel}（台北時間）`
    : taskDeadlineLabel ? `截止 ${taskDeadlineLabel}（台北時間）` : null

  const wonAny = group_status === 'won' || small_status === 'won'
  const hasResult = wonAny || group_status === 'waitlist' || small_status === 'waitlist'

  const groupLine = group_status === 'won'
    ? (() => {
        const txt = assigned_session ? (sessionLabelMap[assigned_session] || '（場次待補）') : '（場次待補）'
        return `<strong style="color:${C.green};">✓ 集體互動：中簽</strong>${serialBadge(group_serial)}<br><span style="color:${C.inkSoft};font-size:13px;">場次：${txt}</span>`
      })()
    : group_status === 'waitlist'
      ? (() => {
          const txt = assigned_session ? (sessionLabelMap[assigned_session] || '（場次待補）') : '（場次待補）'
          return `<strong style="color:#2a6fa8;">✦ 集體互動：候補</strong>${serialBadge(group_serial)}<br><span style="color:${C.inkSoft};font-size:13px;">場次：${txt}</span>`
        })()
    : group_status === 'lost'
      ? `<span style="color:${C.inkMute};">✗ 集體互動：未中簽</span>`
      : `<span style="color:${C.inkMute};">⏳ 集體互動：未定</span>`

  const smallLine = small_status === 'won'
    ? `<strong style="color:${C.green};">✓ 分組互動：中簽</strong>${serialBadge(small_serial)}<br><span style="color:${C.inkSoft};font-size:13px;">小組：${assigned_group ? (teacherLabelMap[assigned_group] || assigned_group) : '（待補）'} 組　日期：${assigned_date || '（待補）'}</span>`
    : small_status === 'waitlist'
      ? `<strong style="color:#2a6fa8;">✦ 分組互動：候補</strong>${serialBadge(small_serial)}<br><span style="color:${C.inkSoft};font-size:13px;">小組：${assigned_group ? (teacherLabelMap[assigned_group] || assigned_group) : '（待補）'} 組　日期：${assigned_date || '（待補）'}</span>`
    : small_status === 'lost'
      ? `<span style="color:${C.inkMute};">✗ 分組互動：未中簽</span>`
      : `<span style="color:${C.inkMute};">⏳ 分組互動：未定</span>`

  const taskLink = `${baseUrl}/member/interactive/task?id=${registration_id}&code=${random_code}`
  const onlyWaitlist = !wonAny && hasResult

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
      <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">恭喜您中簽！請於截止時間前填寫互動作業，老師會依您的問題與背景準備指導。</p>
      ${taskTimeRange ? `<p style="font-size:13px;color:${C.inkMute};margin:0 0 12px;">📅 作業填寫期間：<strong style="color:${C.ink};">${taskTimeRange}</strong></p>` : ''}
      ${emailButton(taskLink, '前往填寫互動作業', 'green')}
      <p style="margin-top:10px;font-size:12.5px;color:${C.inkMute};">作業內容包含：基本背景、近期實修狀況、希望老師指導的問題（每題 75 字內）。</p>
    ` : onlyWaitlist ? `
      ${emailAlert('您已列入候補名單。如有名額釋出，學會將另行寄信通知，屆時再補填互動作業。請留意您的 Email。')}
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

export async function sendInteractiveTaskConfirmEmail(opts: {
  email: string
  chinese_name: string
  registration_id: string
  random_code: string
  group_status: StatusValue
  small_status: StatusValue
  assigned_session: string | null
  assigned_group: string | null
  assigned_date: string | null
}) {
  const { email, chinese_name, registration_id, random_code,
    group_status, small_status, assigned_session, assigned_group, assigned_date } = opts

  // 從 DB 取得最新 label 與作業截止時間
  const [sessions, slots, config] = await Promise.all([fetchAllSessions(), fetchAllSmallSlots(), fetchInteractiveConfig()])
  const sessionLabelMap = buildSessionLabelMap(sessions)
  const teachers = deriveTeachersFromSlots(slots)
  const teacherLabelMap = buildTeacherLabelMap(teachers)

  const sessionText = assigned_session ? (sessionLabelMap[assigned_session] || '（待補）') : '（待補）'
  const groupText = assigned_group ? (teacherLabelMap[assigned_group] || assigned_group) : '（待補）'
  const dateText = assigned_date || '（待補）'

  const rows: string[] = []
  if (group_status === 'won')
    rows.push(`<tr><td style="padding:10px 14px;border-bottom:1px dotted ${C.line};color:${C.inkMute};font-size:13px;font-weight:600;width:110px;">集體互動</td><td style="padding:10px 14px;border-bottom:1px dotted ${C.line};font-size:13.5px;color:${C.ink};">✓ 中簽　${sessionText}</td></tr>`)
  if (small_status === 'won')
    rows.push(`<tr><td style="padding:10px 14px;color:${C.inkMute};font-size:13px;font-weight:600;">分組互動</td><td style="padding:10px 14px;font-size:13.5px;color:${C.ink};">✓ 中簽　${groupText} 組　${dateText}</td></tr>`)

  const taskLink = `${baseUrl}/member/interactive/task?id=${registration_id}&code=${random_code}`

  const body = `
    ${emailKicker('Interactive Task')}
    ${emailH1('互動作業已收到 🙏')}
    <p style="margin:0 0 14px;color:${C.inkSoft};">${chinese_name} 法友您好，</p>
    <p style="margin:0 0 20px;color:${C.inkSoft};">系統已收到您的互動作業，感謝填寫。老師將依您的問題與背景準備指導。</p>

    <table style="border-collapse:collapse;width:100%;background:${C.bgPure};border:1px solid ${C.line};border-radius:10px;overflow:hidden;margin-bottom:20px;">
      ${rows.join('')}
    </table>

    ${(() => {
      const open = config.task_open_ms ? fmtTaipei(config.task_open_ms) : null
      const dead = config.task_deadline_ms ? fmtTaipei(config.task_deadline_ms) : null
      const range = open && dead
        ? `開放 ${open} ～ 截止 ${dead}（台北時間）`
        : dead ? `截止 ${dead}（台北時間）` : null
      return range
        ? `<p style="font-size:13px;color:${C.inkMute};margin-top:8px;">📅 作業填寫期間：<strong style="color:${C.ink};">${range}</strong>，截止前可重新開啟修改，以最後一次送出為準：</p>`
        : `<p style="font-size:13px;color:${C.inkMute};margin-top:8px;">截止前可重新開啟作業頁面修改，以最後一次送出為準：</p>`
    })()}
    ${emailButton(taskLink, '查看／修改互動作業', 'green')}

    ${emailSignoff()}
  `

  return sendMailWithRetry({
    to: email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】互動作業確認',
    html: emailWrap(body),
  }, { mailType: 'interactive_notify' })
}
