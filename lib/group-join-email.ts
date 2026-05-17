import { sendMailWithRetry } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailSignoff } from './email-style'
import { SITE_ASSETS } from './site-assets'

const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

type GroupJoinReg = {
  id: string
  email: string
  chinese_name: string
  line_qr_url: string | null
  wechat_qr_url: string | null
}

function qrBlock(platform: 'LINE' | 'WeChat', groupQrUrl: string): string {
  const color = platform === 'LINE' ? '#06C755' : '#07C160'
  const instruction =
    platform === 'LINE'
      ? '使用 LINE App 掃描以下 QR Code，即可加入本屆學員群組。'
      : '使用微信掃描以下 QR Code，即可加入本屆學員群組。'
  return `
    <div style="background:${C.bgPure};border:1px solid ${C.line};border-radius:12px;padding:18px 22px;margin:14px 0;text-align:center;">
      <div style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:13px;padding:3px 14px;border-radius:999px;margin-bottom:12px;">${platform} 群組</div>
      <p style="margin:0 0 14px;color:${C.inkSoft};font-size:13.5px;">${instruction}</p>
      <img src="${groupQrUrl}" alt="${platform} 群組 QR Code"
        style="width:220px;height:220px;object-fit:contain;border-radius:8px;border:1px solid ${C.line};" />
    </div>
  `
}

export function buildGroupJoinPayload(reg: GroupJoinReg) {
  const hasLine = !!reg.line_qr_url
  const hasWechat = !!reg.wechat_qr_url

  const qrBlocks = [
    hasLine ? qrBlock('LINE', SITE_ASSETS.groupQrLine) : '',
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
    <p style="margin:0 0 20px;color:${C.inkSoft};">
      歡迎加入本屆禪修學員通訊群組！群組將用於發佈禪修相關公告與提醒，請勿在群組中聊天。
    </p>

    ${emailH3('加入群組')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">${platformNote}</p>

    ${qrBlocks}

    <div style="background:#fffbf0;border-left:3px solid ${C.gold};border-radius:6px;padding:12px 16px;margin:18px 0;">
      <p style="margin:0;font-size:13.5px;color:${C.ink};">
        <strong>加入後請將群組暱稱修改為您的姓名</strong>（即報名時填寫的中文姓名：${reg.chinese_name}），方便學會工作人員識別。
      </p>
    </div>

    <p style="color:${C.inkMute};font-size:13px;margin-top:18px;">如有任何問題請聯絡學會。</p>
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
