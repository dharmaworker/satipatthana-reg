import { sendMailWithRetry } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailWarning, emailHighlight, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export async function sendInteractiveInviteEmail(reg: {
  id: string
  email: string
  chinese_name: string
  random_code: string
  member_id: string | null
}) {
  const body = `
    ${emailKicker('Interactive Registration')}
    ${emailH1('第二屆台灣四念處禪修課程－互動報名開放通知')}
    <p style="margin:0 0 12px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 16px;color:${C.inkSoft};">本屆禪修課程的「互動報名」已開放填寫，請於截止前完成登記。</p>

    ${emailH3('關於互動報名')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 10px;line-height:1.85;">
      互動報名分為兩部分：<strong style="color:${C.ink};">集體互動</strong>與<strong style="color:${C.ink};">分組互動</strong>，請在同一表單內一併登記。
    </p>
    <ul style="font-size:13.5px;color:${C.inkSoft};line-height:1.95;padding-left:22px;margin:0 0 12px;">
      <li><strong style="color:${C.green};">集體互動：</strong>勾選想參加的場次（可複選）。學會將以隨機抽籤決定中簽名單。</li>
      <li><strong style="color:${C.green};">分組互動：</strong>將四位老師依意願順序排序（1～4）。學會將依意願順序與容量分配。</li>
      <li>兩部分皆<strong>非必填</strong>，可只報其一或皆不報；若皆不報亦請送出空表單以結束流程。</li>
      <li>抽籤結果由學會於截止後另行寄信通知；中簽者再依信內連結填寫互動作業。</li>
    </ul>

    ${emailButton(`${baseUrl}/member/interactive?id=${reg.id}&code=${reg.random_code}`, '前往填寫互動報名', 'green')}

    ${emailWarning('請於截止時間前完成填寫；逾時系統將不再收件。表單可重複修改、以最後一次送出為準。')}

    ${emailHighlight(`
      <p style="margin:0;font-weight:700;color:${C.greenDeep};font-size:14px;">📋 學員專區</p>
      <p style="margin:8px 0 10px;font-size:13.5px;color:${C.inkSoft};">您也可從學員專區進入互動報名，並查看其他項目進度（繳費、食宿、快篩）：</p>
      ${emailButton(`${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`, '進入學員專區', 'green')}
      <p style="margin:10px 0 0;font-size:12.5px;color:${C.inkMute};">此連結為您的專屬連結，請妥善保管。如需重新登入請至 <a href="${baseUrl}/member" style="color:${C.green};">${baseUrl}/member</a> 並輸入 Email + 專屬碼：<strong style="color:${C.ink};">${reg.random_code}</strong></p>
    `)}

    ${emailSignoff()}
  `

  return sendMailWithRetry({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】互動報名開放通知',
    html: emailWrap(body, { maxWidth: 680 }),
  }, 3, 600, false)
}
