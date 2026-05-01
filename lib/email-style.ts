// Email 共用樣式（cream/green/gold 設計系統）
// 用在 inline style 字串內，因為大多 email client 不吃 CSS class / variable

export const C = {
  green: '#495534',
  greenDeep: '#334026',
  greenSoft: '#6e7a5a',
  gold: '#b49358',
  goldDeep: '#916d3a',
  goldSoft: '#d8c29a',
  ink: '#2e241d',
  inkSoft: '#5a4a3c',
  inkMute: '#85776b',
  error: '#b8523a',
  warning: '#b8852c',
  bg: '#f7f1e8',
  bgPure: '#fbf8f2',
  bgDeep: '#efe6d7',
  line: 'rgba(67, 49, 35, 0.12)',
  lineStrong: 'rgba(67, 49, 35, 0.22)',
}

export const FONT = "'Noto Serif TC','PingFang TC','Microsoft JhengHei',sans-serif"

export function emailWrap(innerHtml: string, opts?: { maxWidth?: number }) {
  const max = opts?.maxWidth || 640
  return `<div style="background:${C.bg};padding:32px 16px;font-family:${FONT};color:${C.ink};line-height:1.75;">
  <div style="max-width:${max}px;margin:0 auto;background:${C.bgPure};border:1px solid ${C.line};border-radius:18px;overflow:hidden;box-shadow:0 8px 20px rgba(49,36,27,0.06);">
    <div style="height:4px;background:linear-gradient(to right,${C.goldSoft},${C.green},${C.goldSoft});"></div>
    <div style="padding:36px 30px;">${innerHtml}</div>
  </div>
  <p style="text-align:center;font-size:11px;color:${C.inkMute};margin:18px 0 0;letter-spacing:0.04em;">© 2026 台灣四念處學會　All rights reserved.</p>
</div>`
}

export function emailKicker(text: string) {
  return `<p style="font-style:italic;font-size:11px;letter-spacing:0.22em;color:${C.gold};text-transform:uppercase;font-weight:600;margin:0 0 8px;">${text}</p>`
}

export function emailH1(text: string) {
  return `<h1 style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.ink};letter-spacing:0.08em;margin:0 0 12px;">${text}</h1>`
}

export function emailH3(text: string) {
  return `<h3 style="font-family:${FONT};font-size:16px;font-weight:700;color:${C.greenDeep};letter-spacing:0.08em;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px dotted ${C.lineStrong};">${text}</h3>`
}

export function emailH4(text: string) {
  return `<h4 style="font-family:${FONT};font-size:14px;font-weight:700;color:${C.ink};letter-spacing:0.06em;margin:18px 0 8px;">${text}</h4>`
}

export function emailButton(href: string, label: string, variant: 'green' | 'gold' = 'green') {
  const bg = variant === 'green' ? C.green : C.goldDeep
  return `<a href="${href}" style="display:inline-block;background:${bg};color:#f8f2e8;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.08em;margin:6px 0;">${label}</a>`
}

export function emailAlert(content: string) {
  return `<div style="background:rgba(216,194,154,0.22);border-left:3px solid ${C.gold};padding:14px 18px;border-radius:10px;margin:14px 0;font-size:13.5px;color:${C.inkSoft};line-height:1.85;">${content}</div>`
}

export function emailWarning(content: string) {
  return `<div style="background:rgba(184,82,58,0.06);border-left:3px solid ${C.error};padding:10px 14px;border-radius:8px;margin:10px 0;font-size:13px;color:${C.error};line-height:1.7;">⚠ ${content}</div>`
}

export function emailHighlight(content: string) {
  return `<div style="background:rgba(73,85,52,0.06);border:1px solid rgba(73,85,52,0.2);padding:16px 20px;border-radius:12px;margin:16px 0;">${content}</div>`
}

export function emailCodeBox(label: string, code: string, hint?: string) {
  return `<div style="background:rgba(216,194,154,0.22);border:1px solid rgba(180,147,88,0.3);border-radius:14px;padding:18px 22px;margin:18px 0;">
    <p style="margin:0;font-size:12.5px;color:${C.goldDeep};font-weight:700;letter-spacing:0.08em;">${label}</p>
    <p style="font-family:'Cormorant Garamond','Noto Serif TC',serif;font-size:30px;font-weight:700;color:${C.green};letter-spacing:0.18em;margin:10px 0 4px;">${code}</p>
    ${hint ? `<p style="margin:4px 0 0;font-size:12px;color:${C.inkMute};">${hint}</p>` : ''}
  </div>`
}

export function emailSignoff() {
  return `<hr style="border:none;border-top:1px dotted ${C.lineStrong};margin:28px 0 16px;">
    <p style="color:${C.inkSoft};font-size:13px;margin:0 0 4px;">如有任何問題，請聯繫台灣四念處學會。</p>
    <p style="color:${C.greenDeep};font-size:13px;margin:4px 0 0;font-weight:600;">台灣四念處學會 🙏</p>`
}

// 表格 (key/value rows)
export function tableRow(label: string, value: string | number | null | undefined) {
  return `<tr><td style="padding:8px 12px;border-bottom:1px dotted ${C.line};color:${C.inkMute};font-size:13px;font-weight:500;width:130px;">${label}</td><td style="padding:8px 12px;border-bottom:1px dotted ${C.line};color:${C.ink};font-size:13.5px;font-weight:600;">${value ?? '—'}</td></tr>`
}

export function tableWrap(rowsHtml: string) {
  return `<table style="border-collapse:collapse;width:100%;background:${C.bgPure};border:1px solid ${C.line};border-radius:10px;overflow:hidden;margin:8px 0;">${rowsHtml}</table>`
}
