import { sendMailWithRetry } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailSignoff } from './email-style'
import { SITE_ASSETS } from './site-assets'

const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

// LINE 群組邀請連結（點擊即可加入，供無法掃 QR Code 者使用）
const LINE_GROUP_URL =
  'https://line.me/ti/g2/SnKbjlJeqmrB_1xuv9WI59C_WWXp30V0HLrqFg?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'

type GroupJoinReg = {
  id: string
  email: string
  chinese_name: string
  member_id: string | null
  line_qr_url: string | null
  wechat_qr_url: string | null
}

function qrBlock(platform: 'LINE' | 'WeChat', groupQrUrl: string, joinUrl?: string): string {
  const color = platform === 'LINE' ? '#06C755' : '#07C160'
  const instruction =
    platform === 'LINE'
      ? '使用 LINE App 掃描以下 QR Code，即可加入本屆學員群組。'
      : '使用微信掃描以下 QR Code，即可加入本屆學員群組。'
  const linkButton = joinUrl
    ? `
      <p style="margin:14px 0 6px;color:${C.inkSoft};font-size:13.5px;">或直接點擊下方按鈕加入：</p>
      <a href="${joinUrl}"
        style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:10px 26px;border-radius:999px;">加入 ${platform} 群組</a>`
    : ''
  return `
    <div style="background:${C.bgPure};border:1px solid ${C.line};border-radius:12px;padding:18px 22px;margin:14px 0;text-align:center;">
      <div style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:13px;padding:3px 14px;border-radius:999px;margin-bottom:12px;">${platform} 群組</div>
      <p style="margin:0 0 14px;color:${C.inkSoft};font-size:13.5px;">${instruction}</p>
      <img src="${groupQrUrl}" alt="${platform} 群組 QR Code"
        style="width:220px;height:220px;object-fit:contain;border-radius:8px;border:1px solid ${C.line};" />
      ${linkButton}
    </div>
  `
}

export function buildGroupJoinPayload(reg: GroupJoinReg) {
  const hasLine = !!reg.line_qr_url
  const hasWechat = !!reg.wechat_qr_url

  const qrBlocks = [
    hasLine ? qrBlock('LINE', SITE_ASSETS.groupQrLine, LINE_GROUP_URL) : '',
    hasWechat ? qrBlock('WeChat', SITE_ASSETS.groupQrWechat) : '',
  ].join('')

  const platformNote =
    hasLine && hasWechat
      ? '您的報名資料中留有 LINE 及微信資訊，以下提供兩個群組的 QR Code，請加入您常用的群組即可。'
      : hasLine
      ? '依您的報名資料（留有 LINE 資訊），以下提供 LINE 群組 QR Code。'
      : '依您的報名資料（留有微信資訊），以下提供微信群組 QR Code。'

  const body = `
    ${emailKicker('Group Invitation')}
    ${emailH1('第二屆台灣四念處禪修・學員群組邀請')}
    <p style="margin:0 0 16px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 16px;color:${C.inkSoft};">
      本屆禪修營的相關資訊（報到流程、行前叮嚀、課程異動公告等）將透過學員群組統一佈達，
      <strong style="color:${C.ink};">請務必加入群組</strong>，以確保您能即時收到所有重要通知。
    </p>
    <div style="background:#fff8ee;border-left:3px solid ${C.gold};border-radius:6px;padding:12px 16px;margin:0 0 20px;">
      <p style="margin:0;font-size:13.5px;color:${C.ink};">
        群組為單向公告用途，請勿在群組中聊天。如有問題，請直接聯絡學會。
      </p>
    </div>

    ${emailH3('加入群組')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">${platformNote}</p>

    ${qrBlocks}

    <div style="background:#fffbf0;border-left:3px solid ${C.gold};border-radius:6px;padding:12px 16px;margin:18px 0;">
      <p style="margin:0;font-size:13.5px;color:${C.ink};">
        <strong>加入後請將群組暱稱修改為報名序號${reg.member_id || 'T-○○○'}＋${reg.chinese_name}</strong>，方便學會工作人員識別。
      </p>
    </div>

    ${emailSignoff()}
  `

  return {
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】學員群組邀請',
    html: emailWrap(body, { maxWidth: 620 }),
  }
}

export async function sendGroupJoinEmail(reg: GroupJoinReg) {
  return sendMailWithRetry(buildGroupJoinPayload(reg))
}
