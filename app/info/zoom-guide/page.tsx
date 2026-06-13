'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type AuthState = 'loading' | 'need_login' | 'not_approved' | 'ok'
type Tab = 'equipment' | 'download' | 'interpret'

// Shared SVG gradient/pattern defs referenced by inline illustrations
const SHARED_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<pattern id="dotsBlue" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#1f7fe8" fill-opacity="0.16"/></pattern>
<radialGradient id="screenGlow" cx="50%" cy="34%" r="80%"><stop offset="0%" stop-color="#f1f7ff"/><stop offset="100%" stop-color="#d2e4fb"/></radialGradient>
<linearGradient id="blueBtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3d97ff"/><stop offset="100%" stop-color="#0E72ED"/></linearGradient>
</defs></svg>`

// ── Shared sub-components ─────────────────────────────────────

function ZgArt({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <article className="zg-art" style={style}>{children}</article>
}

function ZgCard({ n, html, title, sub, titleColor = '#3a2f25', subColor = '#7a6f5c', style }:
  { n?: number; html: string; title: string; sub?: string; titleColor?: string; subColor?: string; style?: React.CSSProperties }) {
  return (
    <div className="zg-card" style={style}>
      {n !== undefined && <span className="zg-badge">{n}</span>}
      <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />
      <div style={{ fontSize: 15.5, fontWeight: 700, color: titleColor, marginTop: 8 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: subColor, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ZgH3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '0 0 12px', fontSize: 23, fontWeight: 700 }}>{children}</h3>
}

function ZgP({ children, mb = 12 }: { children: React.ReactNode; mb?: number }) {
  return <p style={{ margin: `0 0 ${mb}px`, fontSize: 17, color: '#4f4032' }}>{children}</p>
}

// ── Equipment Section ──────────────────────────────────────────
function EquipmentSection() {
  return (
    <>
      {/* Summary 2×2 grid */}
      <div className="zg2" style={{ margin: '22px 0' }}>
        {[
          { bg: '#9dcbb0', label: '網路', text: '最好準備 2 條網路線路，比如：手機流量、WiFi 訊號（滿格）、電腦可以考慮連接網線；網費充足。設備盡量不要開其他軟體，這樣更好地保持網路和運行通暢。' },
          { bg: '#f4cd6e', label: '電源', text: '請注意在參與活動期間自己的電費繳納情況，避免造成中途停電。活動期間在線時間比較長，建議提前準備行動電源、充電線，避免突然斷電影響參與效果。筆記型電腦建議始終連上電源。' },
          { bg: '#74a9dc', label: '軟體', text: 'ZOOM 軟體提前下載好，並且了解操作（詳細見「下載與加入會議」頁籤）。' },
          { bg: '#a7a36a', label: '儀容坐姿', text: '以示尊重，請不要穿著無袖背心，女生不穿低胸衣服。活動期間每日在線時間較長，建議選擇一個舒服的坐姿。' },
        ].map(({ bg, label, text }) => (
          <div key={label} style={{ background: '#fdfaf2', border: '1px solid #e3d9c6', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(60,50,40,.05)' }}>
            <b style={{ display: 'inline-block', background: bg, border: '2.5px solid #5e4b3c', borderRadius: 10, padding: '3px 12px', fontSize: 16, marginBottom: 8 }}>{label}</b>
            <p style={{ margin: 0, fontSize: 16, color: '#4f4032' }}>{text}</p>
          </div>
        ))}
      </div>

      {/* 一、網路 */}
      <ZgArt>
        <ZgH3>一、網路</ZgH3>
        <ZgP mb={0}>目前長時間在線，設備不會過熱，且網速最為穩定的最佳推薦方案是：使用電腦登入 ZOOM，並通過網線直接連接電腦和路由器（如左圖），有線連接更穩定。部分沒有網線接口的電腦型號，可以採用 USB 網線轉換器（如右圖）。</ZgP>
        <div className="zg2s">
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', gap: 7, alignItems: 'center', background: '#3f8e69', color: '#fff', borderRadius: 999, padding: '4px 14px', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>✓ 最穩定方案</div>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 300 140" width="100%" style="display:block;margin:0 auto;max-width:300px"><g transform="translate(14 44)"><path d="M20 18l-8 -34M58 12l0 -40M96 18l8 -34" stroke="#5e4b3c" stroke-width="4" stroke-linecap="round"/><ellipse cx="12" cy="-18" rx="5" ry="8" fill="#7fb89b" stroke="#5e4b3c" stroke-width="2.5"/><ellipse cx="58" cy="-30" rx="5" ry="8" fill="#7fb89b" stroke="#5e4b3c" stroke-width="2.5"/><ellipse cx="104" cy="-18" rx="5" ry="8" fill="#7fb89b" stroke="#5e4b3c" stroke-width="2.5"/><rect x="0" y="12" width="116" height="50" rx="11" fill="#fff" stroke="#5e4b3c" stroke-width="4"/><text x="58" y="34" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="900" fill="#9a8a74" text-anchor="middle">WiFi</text><circle cx="34" cy="48" r="4.5" fill="#1f8a5b" stroke="#5e4b3c" stroke-width="1.6"/><circle cx="54" cy="48" r="4.5" fill="#1f8a5b" stroke="#5e4b3c" stroke-width="1.6"/><circle cx="74" cy="48" r="4.5" fill="#f4cd6e" stroke="#5e4b3c" stroke-width="1.6"/><text x="58" y="84" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="700" fill="#6f5a49" text-anchor="middle">路由器</text></g><path d="M150 108 C 196 108 178 80 222 80" fill="none" stroke="#5e4b3c" stroke-width="10" stroke-linecap="round"/><path d="M150 108 C 196 108 178 80 222 80" fill="none" stroke="#f4cd6e" stroke-width="6" stroke-linecap="round"/><g transform="translate(196 30)"><rect x="0" y="0" width="92" height="62" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="4"/><rect x="9" y="9" width="74" height="44" rx="5" fill="url(#screenGlow)"/><rect x="9" y="9" width="74" height="12" rx="4" fill="#0E72ED"/><text x="16" y="18" font-family="'Noto Sans TC',sans-serif" font-size="8" font-weight="900" fill="#fff">Zoom</text><rect x="36" y="62" width="20" height="12" fill="#e7d2ac" stroke="#5e4b3c" stroke-width="3"/><text x="46" y="92" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="700" fill="#6f5a49" text-anchor="middle">電腦</text></g></svg>` }} />
            <div style={{ fontSize: 15.5, fontWeight: 700, color: '#3a2f25', marginTop: 10 }}>電腦＋網線直連路由器</div>
            <div style={{ fontSize: 13.5, color: '#b88a1e', fontWeight: 700, marginTop: 2 }}>網線（LAN 線）插到底「卡」一聲</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#eef1ee', color: '#7f8a55', borderRadius: 999, padding: '4px 14px', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>沒有網孔？</div>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 200 140" width="100%" style="display:block;margin:0 auto;max-width:200px"><rect x="20" y="56" width="34" height="26" rx="4" fill="#b9c3cf" stroke="#5e4b3c" stroke-width="3"/><path d="M54 69h16" stroke="#5e4b3c" stroke-width="7" stroke-linecap="round"/><rect x="70" y="48" width="60" height="42" rx="8" fill="#eaf3ff" stroke="#5e4b3c" stroke-width="3.5"/><text x="100" y="74" font-family="'Noto Sans TC',sans-serif" font-size="11" font-weight="900" fill="#1f5fb0" text-anchor="middle">USB</text><rect x="130" y="58" width="22" height="20" rx="3" fill="#3a3742" stroke="#5e4b3c" stroke-width="3"/><path d="M152 68c26 0 24 34 24 40" fill="none" stroke="#f4cd6e" stroke-width="6" stroke-linecap="round"/></svg>` }} />
            <div style={{ fontSize: 15.5, fontWeight: 700, color: '#3a2f25', marginTop: 10 }}>USB 網線轉換器</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>把網線轉成 USB 插上電腦</div>
          </div>
        </div>
      </ZgArt>

      {/* 二、電源 */}
      <ZgArt>
        <ZgH3>二、電源</ZgH3>
        <ZgP>活動期間在線時間比較長，建議可以提前準備行動電源、充電線，避免突然沒電影響參與效果；筆記型電腦直接連電源，不用電池。</ZgP>
        <ZgP mb={0}>建議在設備附近準備插座，提前插好，沒電的時候可以順手給設備充電。</ZgP>
        <div className="zg3">
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 120 110" width="120" height="100" style="display:block;margin:0 auto 6px"><rect x="30" y="6" width="60" height="50" rx="12" fill="#f3f8ff" stroke="#5e4b3c" stroke-width="3.5"/><circle cx="60" cy="28" r="15" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="54" y="21" width="5" height="11" rx="2" fill="#5e4b3c"/><rect x="62" y="21" width="5" height="11" rx="2" fill="#5e4b3c"/><rect x="46" y="56" width="28" height="16" rx="4" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><path d="M60 72c0 18 14 22 34 22" fill="none" stroke="#5e4b3c" stroke-width="5" stroke-linecap="round"/><g transform="translate(80 78)"><circle cx="12" cy="10" r="11" fill="#fff5cc" stroke="#f0c452" stroke-width="2.5"/><path d="M13 3l-6 9h5l-3 7 7-10h-5z" fill="#f0a93a" stroke="#5e4b3c" stroke-width="1.3" stroke-linejoin="round"/></g></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>插座先插好</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>設備附近備插座</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 150 110" width="150" height="100" style="display:block;margin:0 auto 6px"><rect x="10" y="14" width="56" height="84" rx="12" fill="#eaf3ff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="20" y="26" width="36" height="26" rx="5" fill="#fff" stroke="#5e4b3c" stroke-width="2.5"/><rect x="24" y="31" width="7" height="16" rx="2" fill="#1f8a5b"/><rect x="33" y="31" width="7" height="16" rx="2" fill="#1f8a5b"/><rect x="42" y="31" width="7" height="16" rx="2" fill="#1f8a5b"/><path d="M66 56c24 0 18 14 40 14" fill="none" stroke="#5e4b3c" stroke-width="5" stroke-linecap="round"/><rect x="100" y="22" width="44" height="76" rx="11" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="108" y="32" width="28" height="50" rx="5" fill="#eef5ff"/><path d="M124 44l-8 14h6l-3 11 9-16h-6z" fill="#1f8a5b" stroke="#5e4b3c" stroke-width="1.5" stroke-linejoin="round"/></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>行動電源充手機</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>備行動電源、充電線</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 150 110" width="150" height="100" style="display:block;margin:0 auto 6px"><rect x="18" y="20" width="104" height="66" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="28" y="30" width="84" height="46" rx="5" fill="url(#screenGlow)"/><path d="M74 40l-9 16h7l-3 13 11-19h-7z" fill="#1f8a5b" stroke="#5e4b3c" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 86h124l-10 12H18z" fill="#e7d2ac" stroke="#5e4b3c" stroke-width="3.5" stroke-linejoin="round"/><path d="M122 56c26 0 26 40 4 40" fill="none" stroke="#5e4b3c" stroke-width="5" stroke-linecap="round"/><rect x="112" y="92" width="24" height="16" rx="4" fill="#fff" stroke="#5e4b3c" stroke-width="2.5"/></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>筆電一直接電源</div>
            <div style={{ fontSize: 13.5, color: '#c0463a', marginTop: 2 }}>不要用電池</div>
          </div>
        </div>
      </ZgArt>

      {/* 三、鏡頭 */}
      <ZgArt>
        <ZgH3>三、鏡頭</ZgH3>
        <ZgP>1. 保持手機、平板鏡頭攝影機<strong>橫向</strong>。</ZgP>
        <ZgP>2. 參與活動時，請保持與螢幕<strong>平視</strong>；不俯視螢幕，以示尊重，也不仰視，長時間仰視可能脖頸不舒服。</ZgP>
        <ZgP mb={0}>3. 建議提前準備支架或者可以墊高的東西，避免鏡頭晃動。</ZgP>
        <div className="zg3">
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: '#fff', border: '1px solid #d8cbb0', fontWeight: 700, color: '#7f8a55', fontSize: 14, marginBottom: 8 }}>1</span>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 160 96" width="150" height="90" style="display:block;margin:0 auto 6px"><rect x="14" y="22" width="40" height="56" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="20" y="29" width="28" height="38" rx="3" fill="#eef5ff"/><g transform="translate(34 50)"><circle r="13" fill="none" stroke="#d9544a" stroke-width="4"/><path d="M-8 -8l16 16M8 -8l-16 16" stroke="#d9544a" stroke-width="4" stroke-linecap="round"/></g><path d="M66 50 C 78 34 92 34 104 44" fill="none" stroke="#97a06a" stroke-width="5" stroke-linecap="round"/><path d="M104 34l7 13-15 1z" fill="#97a06a"/><rect x="100" y="32" width="52" height="36" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="107" y="39" width="38" height="22" rx="3" fill="#eef5ff"/><g transform="translate(146 70)"><circle r="13" fill="#1f8a5b"/><path d="M-6 0l4 5 8-9" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>鏡頭要橫向</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>攝影機轉成橫的</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: '#fff', border: '1px solid #d8cbb0', fontWeight: 700, color: '#7f8a55', fontSize: 14, marginBottom: 8 }}>2</span>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 180 96" width="160" height="90" style="display:block;margin:0 auto 6px"><g transform="translate(26 30)"><circle cx="0" cy="14" r="13" fill="#e7ded0" stroke="#5e4b3c" stroke-width="3"/><path d="M-20 58 C -20 34 -10 24 0 24 C 10 24 20 34 20 58 Z" fill="#e7ded0" stroke="#5e4b3c" stroke-width="3"/></g><path d="M58 50 H 118" stroke="#3f8e69" stroke-width="3" stroke-dasharray="8 6" stroke-linecap="round"/><g transform="translate(92 50)"><circle r="11" fill="#1f8a5b"/><path d="M-5 0l3.5 4 7-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><rect x="120" y="22" width="52" height="46" rx="6" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="127" y="29" width="38" height="26" rx="3" fill="url(#screenGlow)"/><rect x="127" y="29" width="38" height="8" fill="#0E72ED"/><rect x="139" y="68" width="14" height="9" fill="#e7d2ac" stroke="#5e4b3c" stroke-width="3"/></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>與螢幕平視</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>不俯視、不仰視</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: '#fff', border: '1px solid #d8cbb0', fontWeight: 700, color: '#7f8a55', fontSize: 14, marginBottom: 8 }}>3</span>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 120 100" width="120" height="90" style="display:block;margin:0 auto 6px"><rect x="42" y="6" width="38" height="60" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="48" y="13" width="26" height="42" rx="3" fill="#eef5ff"/><path d="M36 36h10M76 36h10" stroke="#5e4b3c" stroke-width="5" stroke-linecap="round"/><path d="M61 66 V 88 M61 88 L 34 100 M61 88 L 88 100 M61 94 L 61 100" fill="none" stroke="#5e4b3c" stroke-width="5" stroke-linecap="round"/></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>用支架或墊高</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>避免鏡頭晃動</div>
          </div>
        </div>
      </ZgArt>

      {/* 四、散熱 */}
      <ZgArt>
        <ZgH3>四、散熱</ZgH3>
        <ZgP mb={0}>手機、平板、筆記型電腦長時間使用容易發燙、機器過熱，導致訊號下降，或者有些會出現黑屏、中途掉出 ZOOM 會議室，所以建議您提前準備散熱的設備，比如散熱器、散熱支架、小風扇等。</ZgP>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fbeee9', border: '1px solid #e7c4ba', borderRadius: 12, padding: '12px 16px', margin: '18px 0 14px' }}>
          <div style={{ lineHeight: 0, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 44 44" width="34" height="34"><path d="M22 6 L40 38 L4 38 Z" fill="#f4cd6e" stroke="#5e4b3c" stroke-width="3" stroke-linejoin="round"/><rect x="19.5" y="17" width="5" height="13" rx="2.5" fill="#5e4b3c"/><circle cx="22" cy="34" r="2.8" fill="#5e4b3c"/></svg>` }} />
          <span style={{ fontSize: 16, color: '#a8493c', fontWeight: 700 }}>機器太燙會訊號下降、黑屏，甚至中途掉出 ZOOM 會議室——提前準備散熱設備。</span>
        </div>
        <div className="zg3" style={{ margin: 0 }}>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 110 110" width="100" height="100" style="display:block;margin:0 auto 6px"><circle cx="55" cy="46" r="40" fill="#fff" stroke="#5e4b3c" stroke-width="4"/><path d="M55 42c-8-25 13-34 23-20 9 13-5 22-23 20M55 50c8 25-13 34-23 20-9-13 5-22 23-20M51 46c-25 8-34-13-20-23 13-9 22 5 20 23M59 46c25-8 34 13 20 23-13 9-22-5-20-23" fill="#9dcbb0" stroke="#5e4b3c" stroke-width="2.5"/><circle cx="55" cy="46" r="7" fill="#3f8e69" stroke="#5e4b3c" stroke-width="2.5"/><rect x="47" y="86" width="16" height="18" fill="#cdb88f" stroke="#5e4b3c" stroke-width="3"/></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>小風扇</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>USB 風扇吹涼</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 120 110" width="110" height="100" style="display:block;margin:0 auto 6px"><rect x="14" y="24" width="92" height="56" rx="7" fill="#fff" stroke="#5e4b3c" stroke-width="4" transform="rotate(-8 60 52)"/><rect x="26" y="34" width="68" height="36" rx="4" fill="url(#screenGlow)" transform="rotate(-8 60 52)"/><path d="M16 92 L 48 70 M104 86 L 72 64 M22 92h78" fill="none" stroke="#5e4b3c" stroke-width="5.5" stroke-linecap="round"/><circle cx="60" cy="96" r="11" fill="#e6f4ed" stroke="#5e4b3c" stroke-width="3"/><path d="M60 87v18M51 96h18" stroke="#9dcbb0" stroke-width="3.5" stroke-linecap="round"/></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>散熱支架</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>墊高通風</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '20px 14px 16px', textAlign: 'center' }}>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 140 110" width="120" height="100" style="display:block;margin:0 auto 6px"><rect x="34" y="14" width="72" height="32" rx="5" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="41" y="21" width="58" height="18" rx="3" fill="url(#screenGlow)"/><rect x="28" y="46" width="84" height="16" rx="4" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><path d="M16 66 h108 l-9 22 H25 z" fill="#dcefff" stroke="#5e4b3c" stroke-width="4" stroke-linejoin="round"/><circle cx="52" cy="76" r="10" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><path d="M52 68v16M44 76h16" stroke="#9dcbb0" stroke-width="3.2" stroke-linecap="round"/><circle cx="88" cy="76" r="10" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><path d="M88 68v16M80 76h16" stroke="#9dcbb0" stroke-width="3.2" stroke-linecap="round"/></svg>` }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2f25' }}>筆電散熱墊</div>
            <div style={{ fontSize: 13.5, color: '#7a6f5c', marginTop: 2 }}>墊在筆電下方</div>
          </div>
        </div>
      </ZgArt>
    </>
  )
}

// ── Download + Join Section ────────────────────────────────────
function DownloadSection() {
  return (
    <>
      {/* ZOOM 電腦用戶端 */}
      <ZgArt>
        <ZgH3>ZOOM 電腦用戶端</ZgH3>
        <ZgP>請在電腦瀏覽器上輸入官網下載頁：<strong style={{ color: '#1f5fb0' }}>zoom.us/download</strong>，網站會自動依您所在的地區顯示對應語言，再點擊<strong>下載</strong>即可。</ZgP>
        <p style={{ margin: '0 0 14px', fontSize: 14.5, color: '#8a7c63' }}>小提醒：若想換成其他語言，可在網站右上角直接切換語言／地區。</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f8ece3', border: '2.5px solid #a7a36a', borderRadius: 14, padding: '11px 14px' }}>
          <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#a7a36a" stroke="#5e4b3c" stroke-width="2"/><rect x="9.4" y="5.4" width="3.2" height="7" rx="1.6" fill="#fff"/><circle cx="11" cy="15.6" r="1.8" fill="#fff"/></svg>` }} />
          <span style={{ fontSize: 16, color: '#a85f3c', fontWeight: 700 }}>請勿下載網頁版的 ZOOM 用戶端。</span>
        </div>
        <figure style={{ margin: '20px auto 0', maxWidth: 560 }}>
          <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 580 392" role="img" aria-label="電腦瀏覽器下載 Zoom 用戶端示意圖" style="width:100%;display:block"><rect x="14" y="14" width="552" height="364" rx="26" fill="#f7f1e6" stroke="#5e4b3c" stroke-width="5"/><rect x="50" y="46" width="486" height="304" rx="16" fill="#cdb88f"/><rect x="46" y="42" width="486" height="300" rx="16" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><path d="M46 58 a16 16 0 0 1 16 -16 h454 a16 16 0 0 1 16 16 v28 h-486 Z" fill="#f1e3cb"/><circle cx="74" cy="64" r="7" fill="#ef9a86" stroke="#5e4b3c" stroke-width="2"/><circle cx="98" cy="64" r="7" fill="#f3cd72" stroke="#5e4b3c" stroke-width="2"/><circle cx="122" cy="64" r="7" fill="#93c9ac" stroke="#5e4b3c" stroke-width="2"/><rect x="148" y="52" width="360" height="24" rx="12" fill="#fff" stroke="#d4c2a6" stroke-width="2.5"/><circle cx="164" cy="64" r="5" fill="none" stroke="#9a8a74" stroke-width="2"/><text x="178" y="69" font-family="'Noto Sans TC',sans-serif" font-size="13" fill="#6f5a49">zoom.us/download</text><rect x="74" y="104" width="74" height="28" rx="7" fill="#0E72ED"/><text x="86" y="124" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="900" fill="#fff">zoom</text><text x="74" y="170" font-family="'Noto Sans TC',sans-serif" font-size="18" font-weight="900" fill="#3a2f25">Zoom Workplace</text><text x="74" y="193" font-family="'Noto Sans TC',sans-serif" font-size="14" fill="#6f5a49">適用於 Windows</text><rect x="76" y="216" width="120" height="42" rx="21" fill="#0B5CD8"/><rect x="74" y="212" width="120" height="42" rx="21" fill="url(#blueBtn)" stroke="#0B5CD8" stroke-width="2"/><text x="134" y="239" font-family="'Noto Sans TC',sans-serif" font-size="18" font-weight="900" fill="#fff" text-anchor="middle">下載</text><rect x="206" y="212" width="92" height="42" rx="21" fill="#fff" stroke="#0E72ED" stroke-width="2.5"/><text x="252" y="239" font-family="'Noto Sans TC',sans-serif" font-size="14" fill="#0E72ED" text-anchor="middle">32-bit</text><rect x="310" y="212" width="92" height="42" rx="21" fill="#fff" stroke="#0E72ED" stroke-width="2.5"/><text x="356" y="239" font-family="'Noto Sans TC',sans-serif" font-size="14" fill="#0E72ED" text-anchor="middle">ARM64</text><rect x="74" y="276" width="380" height="46" rx="13" fill="#eaf3ff" stroke="#74a9dc" stroke-width="2.5"/><rect x="74" y="276" width="380" height="46" rx="13" fill="url(#dotsBlue)"/><text x="92" y="304" font-family="'Noto Sans TC',sans-serif" font-size="15.5" font-weight="700" fill="#1f5fb0">下載安裝版用戶端，不使用網頁版</text><path d="M150 248l0 26 7-7 5 11 6-3-5-10 10 0z" fill="#fff" stroke="#5e4b3c" stroke-width="2.2" stroke-linejoin="round"/></svg>` }} />
          <figcaption style={{ marginTop: 10, textAlign: 'center', fontFamily: 'var(--font-noto-serif-tc),"Noto Serif TC",serif', fontSize: 13.5, color: '#9a8c6f', letterSpacing: '.02em' }}>① 輸入官網　② 點下載　③ 安裝用戶端</figcaption>
        </figure>
      </ZgArt>

      {/* ZOOM 手機/平板 */}
      <ZgArt>
        <ZgH3>ZOOM 手機／平板用戶端下載</ZgH3>
        <ZgP><strong>蘋果用戶：</strong>直接在 App Store 中搜尋下載 <strong style={{ color: '#1f5fb0' }}>zoom cloud meeting</strong>。</ZgP>
        <ZgP mb={0}><strong>安卓用戶（華為、小米、vivo 等）：</strong>請先打開手機或平板的瀏覽器；在瀏覽器頂端的網址列輸入 <strong style={{ color: '#1f5fb0' }}>zoom.us/download</strong>，然後選擇「<strong>從 Zoom 網站下載</strong>」。</ZgP>
        <div className="zg2" style={{ margin: 0 }}>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#3a2f25', marginBottom: 12 }}>蘋果用戶</div>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 200 296" width="172" style="display:block;margin:0 auto"><rect x="14" y="8" width="178" height="284" rx="30" fill="#cdb88f"/><rect x="10" y="4" width="178" height="284" rx="30" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><rect x="28" y="34" width="142" height="234" rx="16" fill="#f3f8ff" stroke="#d4c2a6" stroke-width="2.5"/><rect x="44" y="48" width="110" height="30" rx="15" fill="#fff" stroke="#c9d6e6" stroke-width="2.5"/><circle cx="60" cy="63" r="6" fill="none" stroke="#9a8a74" stroke-width="2"/><text x="74" y="68" font-family="'Noto Sans TC',sans-serif" font-size="11" fill="#6f5a49">zoom cloud meeting</text><rect x="44" y="96" width="110" height="86" rx="14" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="56" y="112" width="44" height="44" rx="12" fill="#0E72ED"/><circle cx="78" cy="128" r="8" fill="#fff"/><path d="M68 148c4-9 16-9 20 0" fill="#fff"/><text x="110" y="128" font-family="'Noto Sans TC',sans-serif" font-size="14" font-weight="900" fill="#3a2f25">Zoom</text><text x="110" y="146" font-family="'Noto Sans TC',sans-serif" font-size="10.5" fill="#8a7565">Cloud Meetings</text><rect x="108" y="156" width="40" height="22" rx="11" fill="#eaf3ff" stroke="#0E72ED" stroke-width="2.5"/><text x="128" y="171" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="700" fill="#0E72ED" text-anchor="middle">取得</text></svg>` }} />
            <div style={{ fontSize: 14.5, color: '#7a6f5c', marginTop: 10 }}>在 <strong style={{ color: '#3a2f25' }}>App Store</strong> 搜尋下載</div>
          </div>
          <div style={{ background: '#faf6ec', border: '1px solid #e6dcc8', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#3a2f25', marginBottom: 12 }}>安卓用戶</div>
            <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 200 296" width="172" style="display:block;margin:0 auto"><rect x="14" y="8" width="178" height="284" rx="30" fill="#cdb88f"/><rect x="10" y="4" width="178" height="284" rx="30" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><rect x="26" y="30" width="146" height="232" rx="16" fill="#fbf4e6" stroke="#d4c2a6" stroke-width="2.5"/><rect x="40" y="46" width="118" height="28" rx="14" fill="#fff" stroke="#c9b896" stroke-width="2.5"/><circle cx="55" cy="60" r="6" fill="none" stroke="#9a8a74" stroke-width="2"/><text x="68" y="65" font-family="'Noto Sans TC',sans-serif" font-size="12" fill="#6f5a49">zoom.us/download</text><text x="40" y="104" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="900" fill="#3a2f25">Zoom Workplace</text><rect x="40" y="116" width="118" height="34" rx="17" fill="#fff" stroke="#74a9dc" stroke-width="2.5"/><text x="99" y="138" font-family="'Noto Sans TC',sans-serif" font-size="12.5" fill="#5e4b3c" text-anchor="middle">從 Google Play 下載</text><rect x="40" y="160" width="118" height="38" rx="19" fill="url(#blueBtn)" stroke="#0B5CD8" stroke-width="2"/><text x="99" y="184" font-family="'Noto Sans TC',sans-serif" font-size="12.5" font-weight="900" fill="#fff" text-anchor="middle">從 Zoom 網站下載</text><rect x="32" y="154" width="134" height="50" rx="14" fill="none" stroke="#97a06a" stroke-width="3.5" stroke-dasharray="9 7"/></svg>` }} />
            <div style={{ fontSize: 14.5, color: '#7a6f5c', marginTop: 10 }}>瀏覽器選「<strong style={{ color: '#2f7d57' }}>從 Zoom 網站下載</strong>」</div>
          </div>
        </div>
      </ZgArt>

      {/* 安卓下載後安裝 */}
      <ZgArt>
        <ZgH3>安卓下載後安裝</ZgH3>
        <ZgP>點擊<strong>下載</strong>。下載完畢後，選擇「<strong>打開並安裝</strong>」。</ZgP>
        <ZgP mb={18}>通過「<strong>指紋或密碼</strong>」進行認證。稍微等待之後，會出現<strong>安裝成功</strong>的提示。</ZgP>
        <div className="zg4">
          <ZgCard n={1} title="點擊下載" sub="下載中…" html={`<svg viewBox="0 0 92 124" width="64" height="86" style="display:block;margin:0 auto 8px"><rect x="6" y="2" width="80" height="120" rx="16" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="14" y="12" width="64" height="100" rx="9" fill="#eaf3ff"/><rect x="14" y="12" width="64" height="100" rx="9" fill="url(#dotsBlue)"/><rect x="32" y="34" width="28" height="28" rx="7" fill="#0E72ED"/><path d="M46 80l-14-14h8.5v-15h11v15h8.5z" fill="#0E72ED"/><rect x="22" y="92" width="48" height="10" rx="5" fill="#fff" stroke="#74a9dc" stroke-width="2"/><rect x="22" y="92" width="30" height="10" rx="5" fill="#0E72ED"/></svg>`} />
          <ZgCard n={2} title="打開並安裝" sub="下載完選此項" html={`<svg viewBox="0 0 92 124" width="64" height="86" style="display:block;margin:0 auto 8px"><rect x="6" y="2" width="80" height="120" rx="16" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="14" y="12" width="64" height="100" rx="9" fill="#fbf4e6"/><rect x="22" y="40" width="48" height="54" rx="10" fill="#fff" stroke="#5e4b3c" stroke-width="2.5"/><rect x="30" y="50" width="32" height="7" rx="3.5" fill="#e2d4bd"/><rect x="28" y="70" width="36" height="16" rx="8" fill="#0E72ED"/><text x="46" y="82" font-family="'Noto Sans TC',sans-serif" font-size="8.5" font-weight="900" fill="#fff" text-anchor="middle">打開並安裝</text></svg>`} />
          <ZgCard n={3} title="指紋或密碼認證" sub="驗證身分" html={`<svg viewBox="0 0 92 124" width="64" height="86" style="display:block;margin:0 auto 8px"><rect x="6" y="2" width="80" height="120" rx="16" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="14" y="12" width="64" height="100" rx="9" fill="#f6efe2"/><circle cx="46" cy="64" r="26" fill="#fbeee4" stroke="#5e4b3c" stroke-width="3"/><path d="M46 51c-8 0-13 6-13 15v8h26v-8c0-9-5-15-13-15z" fill="none" stroke="#7f8a55" stroke-width="3"/><path d="M39 60c4-5 10-5 14 0M34 67c7-8 17-8 24 0" fill="none" stroke="#7f8a55" stroke-width="2.6" stroke-linecap="round"/></svg>`} />
          <ZgCard n={4} title="等待安裝成功" sub="出現「安裝成功」" subColor="#2f7d57" html={`<svg viewBox="0 0 92 124" width="64" height="86" style="display:block;margin:0 auto 8px"><rect x="6" y="2" width="80" height="120" rx="16" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><rect x="14" y="12" width="64" height="100" rx="9" fill="#eef7f1"/><circle cx="46" cy="58" r="26" fill="#9dcbb0" stroke="#5e4b3c" stroke-width="3"/><path d="M34 58l9 10 16-19" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><g style="animation:twinkle 1.8s ease-in-out infinite" transform="translate(74 28)"><path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#f0c452"/></g></svg>`} />
        </div>
      </ZgArt>

      {/* 中國大陸地區補充 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '34px 0 0' }}>
        <span style={{ flex: 1, height: 1, background: '#d8ccb5' }} />
        <span style={{ fontFamily: 'var(--font-noto-serif-tc),"Noto Serif TC",serif', fontSize: 14, letterSpacing: '.1em', color: '#9a8c6f' }}>中國大陸地區補充</span>
        <span style={{ flex: 1, height: 1, background: '#d8ccb5' }} />
      </div>
      <p style={{ textAlign: 'center', margin: '6px 0 0', fontSize: 14, color: '#9a8c6f' }}>以下兩種狀況通常只有中國大陸會遇到，其他地區（台灣、日本、馬來西亞等）可直接略過。</p>

      <article style={{ background: '#f3eee2', border: '1px solid #ddd0b8', borderRadius: 14, padding: 26, margin: '14px 0 22px', boxShadow: '0 1px 3px rgba(60,50,40,.05)' }}>
        <span style={{ display: 'inline-block', background: '#e7ddc7', border: '1px solid #d2c4a8', borderRadius: 999, padding: '3px 12px', fontSize: 13, fontWeight: 700, color: '#7d6f50', marginBottom: 14 }}>適用地區：中國大陸</span>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: '#a7a36a', border: '1px solid #e3d9c6', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 18 }}>!</span>
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>特殊情況 1：無法訪問 Zoom 網站</h3>
        </div>
        <ZgP mb={14}>請在瀏覽器頂端網址列輸入 <strong>baidu.com</strong>，然後在百度搜尋框輸入 <strong>zoom.us/download</strong>，進入 Zoom 官網進行下載，剩下的步驟同上。</ZgP>
        <div className="zg3" style={{ marginBottom: 26 }}>
          <ZgCard n={1} title="網址列輸入" sub="baidu.com" subColor="#1f5fb0" html={`<svg viewBox="0 0 120 70" width="120" height="70" style="display:block;margin:0 auto 8px"><rect x="10" y="8" width="100" height="54" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="10" y="8" width="100" height="18" rx="9" fill="#f1e3cb"/><rect x="10" y="17" width="100" height="9" fill="#f1e3cb"/><rect x="20" y="12" width="80" height="11" rx="5.5" fill="#fff" stroke="#74a9dc" stroke-width="2"/><text x="28" y="21" font-family="'Noto Sans TC',sans-serif" font-size="9" font-weight="900" fill="#1f5fb0">baidu.com</text><rect x="40" y="36" width="40" height="16" rx="5" fill="#0E72ED"/><text x="60" y="48" font-family="'Noto Sans TC',sans-serif" font-size="10" font-weight="900" fill="#fff" text-anchor="middle">百度</text></svg>`} style={{ padding: '20px 14px 14px' }} />
          <ZgCard n={2} title="百度搜尋" sub="zoom.us/download" html={`<svg viewBox="0 0 120 70" width="120" height="70" style="display:block;margin:0 auto 8px"><text x="12" y="20" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="900" fill="#2b56c4">百度</text><rect x="12" y="28" width="78" height="22" rx="7" fill="#fff" stroke="#74a9dc" stroke-width="2.5"/><text x="20" y="43" font-family="'Noto Sans TC',sans-serif" font-size="9.5" fill="#3a2f25">zoom.us/download</text><rect x="92" y="28" width="22" height="22" rx="7" fill="#2b56c4"/><path d="M101 36a4.5 4.5 0 1 0 0.1 0M105 41l4 4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`} style={{ padding: '20px 14px 14px' }} />
          <ZgCard n={3} title="進官網下載" sub="步驟同上" html={`<svg viewBox="0 0 120 70" width="120" height="70" style="display:block;margin:0 auto 8px"><rect x="30" y="8" width="44" height="17" rx="5" fill="#0E72ED"/><text x="38" y="21" font-family="'Noto Sans TC',sans-serif" font-size="11" font-weight="900" fill="#fff">zoom</text><rect x="30" y="34" width="60" height="24" rx="12" fill="url(#blueBtn)" stroke="#0B5CD8" stroke-width="2"/><text x="60" y="51" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">下載</text></svg>`} style={{ padding: '20px 14px 14px' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: '#a7a36a', border: '1px solid #e3d9c6', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 18 }}>!</span>
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>特殊情況 2：下載成功，但無法安裝</h3>
        </div>
        <ZgP mb={12}><strong>華為手機：</strong>需關閉「純淨模式」：① 點擊桌面「設定」 ② 點擊「系統和更新」 ③ 進入「純淨模式」 ④ 關閉「增強防護」。</ZgP>
        <div className="zg4" style={{ marginBottom: 22 }}>
          <ZgCard n={1} title="設定" sub="點桌面「設定」" html={`<svg viewBox="0 0 80 80" width="60" height="60" style="display:block;margin:0 auto 8px"><circle cx="40" cy="42" r="20" fill="#eef2f7" stroke="#5e4b3c" stroke-width="3"/><circle cx="40" cy="42" r="7" fill="#9a8a74"/><g stroke="#9a8a74" stroke-width="4" stroke-linecap="round"><path d="M40 18v8M40 58v8M16 42h8M56 42h8M24 26l6 6M50 52l6 6M24 58l6-6M56 26l-6 6"/></g></svg>`} style={{ padding: '20px 12px 14px' }} />
          <ZgCard n={2} title="系統和更新" sub="點「系統和更新」" html={`<svg viewBox="0 0 80 80" width="60" height="60" style="display:block;margin:0 auto 8px"><rect x="12" y="18" width="56" height="13" rx="4" fill="#f3ece2"/><rect x="12" y="35" width="56" height="15" rx="4" fill="#eaf3ff" stroke="#0E72ED" stroke-width="2.5"/><rect x="12" y="54" width="56" height="11" rx="4" fill="#f3ece2"/></svg>`} style={{ padding: '20px 12px 14px' }} />
          <ZgCard n={3} title="純淨模式" sub="進入「純淨模式」" html={`<svg viewBox="0 0 80 80" width="60" height="60" style="display:block;margin:0 auto 8px"><path d="M40 14l18 7v14c0 14-9 22-18 26-9-4-18-12-18-26V21z" fill="#9dcbb0" stroke="#3f8e69" stroke-width="3"/></svg>`} style={{ padding: '20px 12px 14px' }} />
          <ZgCard n={4} title="增強防護" sub="關閉（向左關掉）" subColor="#c0463a" html={`<svg viewBox="0 0 80 80" width="60" height="60" style="display:block;margin:0 auto 8px"><rect x="18" y="31" width="44" height="22" rx="11" fill="#e7d9c4" stroke="#5e4b3c" stroke-width="2.5"/><circle cx="29" cy="42" r="8" fill="#fff" stroke="#5e4b3c" stroke-width="2.5"/></svg>`} style={{ padding: '20px 12px 14px' }} />
        </div>

        <ZgP mb={12}><strong>其他品牌安卓手機：</strong>① 在設定中找到「安全」或「隱私」選項，開啟「允許安裝未知來源應用」。② 透過瀏覽器下載 Zoom 應用的安裝檔。③ 下載好安裝檔，點擊進行安裝；如果系統提示需要授權，根據提示操作。</ZgP>
        <div className="zg3" style={{ margin: 0 }}>
          <ZgCard n={1} title="允許未知來源" sub="設定→安全，開啟" subColor="#2f7d57" html={`<svg viewBox="0 0 120 70" width="120" height="70" style="display:block;margin:0 auto 8px"><path d="M40 14l16 6v13c0 12-8 19-16 23-8-4-16-11-16-23V20z" fill="#fde3c8" stroke="#7f8a55" stroke-width="3"/><rect x="66" y="30" width="44" height="22" rx="11" fill="#9dcbb0" stroke="#5e4b3c" stroke-width="2.5"/><circle cx="99" cy="41" r="8" fill="#fff" stroke="#5e4b3c" stroke-width="2.5"/></svg>`} style={{ padding: '20px 14px 14px' }} />
          <ZgCard n={2} title="下載安裝檔" sub="用瀏覽器下載" html={`<svg viewBox="0 0 120 70" width="120" height="70" style="display:block;margin:0 auto 8px"><rect x="22" y="6" width="76" height="58" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="22" y="6" width="76" height="15" rx="9" fill="#f1e3cb"/><rect x="22" y="13" width="76" height="8" fill="#f1e3cb"/><rect x="30" y="9" width="50" height="9" rx="4.5" fill="#fff" stroke="#74a9dc" stroke-width="1.5"/><text x="36" y="16" font-family="'Noto Sans TC',sans-serif" font-size="7" fill="#6f5a49">zoom.us</text><rect x="48" y="28" width="24" height="20" rx="5" fill="#0E72ED"/><path d="M60 60l-12-12h7v-9h10v9h7z" fill="#0E72ED"/></svg>`} style={{ padding: '20px 14px 14px' }} />
          <ZgCard n={3} title="點擊安裝" sub="依提示按「允許」" html={`<svg viewBox="0 0 120 70" width="120" height="70" style="display:block;margin:0 auto 8px"><rect x="30" y="6" width="60" height="40" rx="9" fill="#fbf4e6" stroke="#5e4b3c" stroke-width="2.5"/><rect x="40" y="14" width="40" height="8" rx="4" fill="#e2d4bd"/><rect x="38" y="28" width="44" height="14" rx="7" fill="#0E72ED"/><text x="60" y="38" font-family="'Noto Sans TC',sans-serif" font-size="9" font-weight="900" fill="#fff" text-anchor="middle">安裝</text></svg>`} style={{ padding: '20px 14px 14px' }} />
        </div>
      </article>

      {/* 如何使用 ZOOM 加入會議 */}
      <ZgArt>
        <ZgH3>二、如何使用 ZOOM 加入會議</ZgH3>
        <ZgP>請打開 ZOOM 用戶端，直接點擊<strong>加入會議</strong>。（中國大陸用戶請不要點擊登入）</ZgP>
        <ZgP>在第一欄中輸入<strong>會議號</strong>，例如：833 765 4321。在第二欄中輸入「<strong>學號＋英文姓名拼音</strong>（若無學號則用報名序號）」，例如：A8＋Shun Li，再點擊「加入會議」。</ZgP>
        <ZgP mb={0}>再輸入會議密碼，點擊「<strong>確定</strong>」。</ZgP>
        <div className="zg3">
          <ZgCard n={1} title="點「加入會議」" sub="不要點「登入」" subColor="#c0463a" html={`<svg viewBox="0 0 150 230" width="124" style="display:block;margin:0 auto"><rect x="4" y="4" width="142" height="222" rx="26" fill="#cdb88f"/><rect x="0" y="0" width="142" height="222" rx="26" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><rect x="14" y="22" width="114" height="180" rx="14" fill="#eef5ff" stroke="#d4c2a6" stroke-width="2.5"/><rect x="28" y="40" width="86" height="38" rx="10" fill="#0E72ED"/><text x="71" y="65" font-family="'Noto Sans TC',sans-serif" font-size="16" font-weight="900" fill="#fff" text-anchor="middle">zoom</text><rect x="28" y="92" width="86" height="34" rx="17" fill="url(#blueBtn)" stroke="#0B5CD8" stroke-width="2"/><text x="71" y="114" font-family="'Noto Sans TC',sans-serif" font-size="13" font-weight="900" fill="#fff" text-anchor="middle">加入會議</text><rect x="28" y="134" width="86" height="26" rx="13" fill="#fff" stroke="#d4c2a6" stroke-width="2.5"/><text x="71" y="151" font-family="'Noto Sans TC',sans-serif" font-size="12" fill="#bbb0a0" text-anchor="middle">註冊</text><rect x="28" y="166" width="86" height="26" rx="13" fill="#fff" stroke="#d4c2a6" stroke-width="2.5"/><text x="71" y="183" font-family="'Noto Sans TC',sans-serif" font-size="12" fill="#bbb0a0" text-anchor="middle">登入</text></svg>`} style={{ padding: '20px 14px 16px' }} />
          <ZgCard n={2} title="填會議號＋姓名" sub="學號＋英文拼音" html={`<svg viewBox="0 0 180 230" width="150" style="display:block;margin:0 auto"><rect x="4" y="4" width="172" height="222" rx="26" fill="#cdb88f"/><rect x="0" y="0" width="172" height="222" rx="26" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><rect x="14" y="20" width="144" height="186" rx="14" fill="#fbf4e6" stroke="#d4c2a6" stroke-width="2.5"/><text x="86" y="44" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="900" fill="#3a2f25" text-anchor="middle">加入</text><rect x="28" y="56" width="116" height="32" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="2.5"/><text x="40" y="77" font-family="'Noto Sans TC',sans-serif" font-size="13" fill="#3a2f25">833 765 4321</text><text x="86" y="104" font-family="'Noto Sans TC',sans-serif" font-size="11" fill="#9a8a74" text-anchor="middle">第一欄：會議號</text><rect x="28" y="112" width="116" height="32" rx="9" fill="#fff" stroke="#5e4b3c" stroke-width="2.5"/><text x="40" y="133" font-family="'Noto Sans TC',sans-serif" font-size="13" fill="#3a2f25">A8 Shun Li</text><text x="86" y="160" font-family="'Noto Sans TC',sans-serif" font-size="11" fill="#9a8a74" text-anchor="middle">第二欄：學號＋拼音</text><rect x="30" y="170" width="112" height="32" rx="16" fill="url(#blueBtn)" stroke="#0B5CD8" stroke-width="2"/><text x="86" y="191" font-family="'Noto Sans TC',sans-serif" font-size="13" font-weight="900" fill="#fff" text-anchor="middle">加入會議</text></svg>`} style={{ padding: '20px 14px 16px' }} />
          <ZgCard n={3} title="輸入密碼 → 確定" sub="進入會議室" html={`<svg viewBox="0 0 180 230" width="150" style="display:block;margin:0 auto"><rect x="20" y="70" width="140" height="90" rx="16" fill="#fff" stroke="#5e4b3c" stroke-width="4"/><text x="90" y="100" font-family="'Noto Sans TC',sans-serif" font-size="14" font-weight="700" fill="#3a2f25" text-anchor="middle">輸入會議密碼</text><text x="90" y="126" font-family="'Noto Sans TC',sans-serif" font-size="18" letter-spacing="4" fill="#6f5a49" text-anchor="middle">●●●●●●</text><rect x="56" y="134" width="68" height="14" rx="7" fill="#eef2f7"/></svg>`} style={{ padding: '20px 14px 16px' }} />
        </div>
      </ZgArt>

      {/* 進入會議室後的控制列 */}
      <ZgArt>
        <ZgH3>三、進入會議室後的控制列</ZgH3>
        <ZgP mb={4}>進入會議室後，窗口下方有一個會議控制欄，長這樣（下面分成兩個步驟一步一步教）：</ZgP>
        <figure style={{ margin: '0 0 4px' }}>
          <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 900 150" role="img" aria-label="Zoom 控制列總覽圖" style="width:100%;display:block"><rect x="2" y="2" width="896" height="146" rx="20" fill="#26242b"/><rect x="2" y="2" width="896" height="146" rx="20" fill="none" stroke="#5e4b3c" stroke-width="4"/><g transform="translate(40 30)"><circle cx="32" cy="30" r="26" fill="#1f8a5b"/><path d="M32 16c-5 0-8 4-8 9v6c0 5 3 9 8 9s8-4 8-9v-6c0-5-3-9-8-9z" fill="#fff"/><path d="M20 33c0 7 5 12 12 12s12-5 12-12M32 45v6M24 57h16" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="32" y="80" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">連接語音</text><circle cx="-2" cy="-2" r="13" fill="#f4cd6e" stroke="#fff" stroke-width="2.5"/><text x="-2" y="3" font-size="15" font-weight="900" fill="#5e4b3c" text-anchor="middle">1</text></g><g transform="translate(210 30)"><rect x="6" y="14" width="52" height="32" rx="7" fill="#9aa0a8"/><path d="M58 24l14-8v28l-14-8z" fill="#9aa0a8"/><circle cx="34" cy="30" r="25" fill="none" stroke="#c4564a" stroke-width="5"/><path d="M16 12l36 36" stroke="#c4564a" stroke-width="5" stroke-linecap="round"/><text x="40" y="80" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="700" fill="#d99a92" text-anchor="middle">不開鏡</text></g><g transform="translate(372 30)"><circle cx="24" cy="22" r="11" fill="#cfe0f5"/><path d="M8 46c0-10 7-15 16-15s16 5 16 15z" fill="#cfe0f5"/><circle cx="46" cy="24" r="9" fill="#9fc2ec"/><path d="M34 46c0-8 5-12 12-12s12 4 12 12z" fill="#9fc2ec"/><text x="34" y="80" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">參與者</text><circle cx="0" cy="6" r="13" fill="#f4cd6e" stroke="#fff" stroke-width="2.5"/><text x="0" y="11" font-size="15" font-weight="900" fill="#5e4b3c" text-anchor="middle">2</text></g><g transform="translate(536 34)"><path d="M10 14h44a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H30l-14 12v-12h-6a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z" fill="#cfe0f5"/><text x="34" y="80" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">聊天</text></g><g transform="translate(700 30)"><path d="M30 56V30c0-4 3-7 7-7s7 3 7 7v-2c0-4 3-6 6-6s6 2 6 6v4c0-3 3-5 6-5s6 2 6 6v18c0 12-8 21-22 21-9 0-15-4-19-11l-9-15c-2-4 3-8 6-5z" fill="#f2b8a8" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="20" r="16" fill="none" stroke="#ef6b5a" stroke-width="5"/><path d="M9 9l22 22" stroke="#ef6b5a" stroke-width="5" stroke-linecap="round"/><text x="40" y="84" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="700" fill="#ffb3a6" text-anchor="middle">不要點舉手</text></g></svg>` }} />
        </figure>
      </ZgArt>

      {/* STEP 1: 連接語音 */}
      <article className="zg-art-2col">
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: '#1f8a5b', border: '1px solid #e3d9c6', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>1</span>
            <h4 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>連接語音（聽不到聲音時）</h4>
          </div>
          <p style={{ margin: 0, fontSize: 17, color: '#4f4032' }}>第一個按鈕「<strong>連接語音</strong>」：在進入會議室後，如果聽不到聲音，請點擊連接語音，然後再點擊第一行的「<strong>WiFi 或行動數據</strong>」即可。</p>
        </div>
        <div className="zg2s" style={{ marginTop: 0 }}>
          <ZgCard n={1} title="點「連接語音」" sub="聽不到聲音時" html={`<svg viewBox="0 0 150 116" width="150" height="116" style="display:block;margin:0 auto 6px"><rect x="0" y="0" width="150" height="116" rx="16" fill="#26242b"/><circle cx="75" cy="48" r="28" fill="#1f8a5b"/><path d="M75 32c-5 0-9 4-9 10v6c0 6 4 10 9 10s9-4 9-10v-6c0-6-4-10-9-10z" fill="#fff"/><path d="M61 50c0 8 6 13 14 13s14-5 14-13M75 63v7M66 76h18" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="75" y="100" font-family="'Noto Sans TC',sans-serif" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">連接語音</text><path d="M86 70l0 26 7-7 5 11 6-3-5-10 10 0z" fill="#fff" stroke="#5e4b3c" stroke-width="2.2" stroke-linejoin="round"/></svg>`} style={{ padding: '20px 16px 16px' }} />
          <ZgCard n={2} title="點「WiFi 或行動數據」" sub="選第一行" html={`<svg viewBox="0 0 280 140" width="100%" style="display:block;margin:0 auto;max-width:280px"><rect x="0" y="0" width="280" height="140" rx="14" fill="#fff" stroke="#5e4b3c" stroke-width="4"/><text x="140" y="26" font-family="'Noto Sans TC',sans-serif" font-size="14" font-weight="900" fill="#3a2f25" text-anchor="middle">選擇音訊連接方式</text><rect x="18" y="40" width="244" height="38" rx="10" fill="#eaf3ff" stroke="#0E72ED" stroke-width="3"/><path d="M40 66c8-12 26-12 34 0M46 60c5-7 16-7 22 0" fill="none" stroke="#0E72ED" stroke-width="3" stroke-linecap="round"/><circle cx="57" cy="70" r="2.6" fill="#0E72ED"/><text x="84" y="64" font-family="'Noto Sans TC',sans-serif" font-size="14.5" font-weight="900" fill="#1f5fb0">WiFi 或行動數據</text><rect x="18" y="86" width="244" height="34" rx="10" fill="#f3ece2" stroke="#d4c2a6" stroke-width="2.5"/><text x="36" y="108" font-family="'Noto Sans TC',sans-serif" font-size="13.5" fill="#9a8a74">撥打電話</text><path d="M236 96l0 24 6-6 5 10 6-3-5-9 9 0z" fill="#fff" stroke="#5e4b3c" stroke-width="2.2" stroke-linejoin="round"/></svg>`} style={{ padding: '20px 16px 16px' }} />
        </div>
      </article>

      {/* STEP 2: 參與者 */}
      <ZgArt>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: '#74a9dc', border: '1px solid #e3d9c6', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>2</span>
          <h4 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>參與者（修改自己的名字）</h4>
        </div>
        <ZgP mb={18}>第三個按鈕是「<strong>參與者</strong>」，可供您修改學號和名字。如果進房間之後發現您的名字有誤，請點擊參與者，隊列裡面的第一個就是您。請點擊您的名字，然後選擇「<strong>改名</strong>」，將自己的名字修改為學號＋英文姓名拼音（若無學號則用報名序號），例如：「A8＋Shun Li」。</ZgP>
        <div className="zg4">
          <ZgCard n={1} title="點「參與者」" html={`<svg viewBox="0 0 110 86" width="100" height="78" style="display:block;margin:0 auto 6px"><rect x="0" y="0" width="110" height="86" rx="12" fill="#26242b"/><circle cx="44" cy="34" r="11" fill="#cfe0f5"/><path d="M26 60c0-11 8-16 18-16s18 5 18 16z" fill="#cfe0f5"/><circle cx="70" cy="36" r="9" fill="#9fc2ec"/><path d="M56 60c0-9 6-13 14-13s14 4 14 13z" fill="#9fc2ec"/><text x="55" y="78" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">參與者</text></svg>`} style={{ padding: '20px 12px 14px' }} />
          <ZgCard n={2} title="點自己的名字" html={`<svg viewBox="0 0 130 86" width="120" height="80" style="display:block;margin:0 auto 6px"><rect x="0" y="2" width="130" height="82" rx="12" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="12" y="14" width="106" height="22" rx="7" fill="#fdeee6" stroke="#97a06a" stroke-width="2.5"/><circle cx="28" cy="25" r="8" fill="#7fb89b"/><text x="42" y="30" font-family="'Noto Sans TC',sans-serif" font-size="11.5" font-weight="900" fill="#7f8a55">我（第一個）</text><rect x="12" y="42" width="106" height="15" rx="5" fill="#f3ece2"/><rect x="12" y="62" width="106" height="15" rx="5" fill="#f3ece2"/></svg>`} style={{ padding: '20px 12px 14px' }} />
          <ZgCard n={3} title="選「改名」" html={`<svg viewBox="0 0 130 86" width="120" height="80" style="display:block;margin:0 auto 6px"><rect x="8" y="6" width="114" height="74" rx="12" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><rect x="20" y="18" width="90" height="26" rx="8" fill="#eaf3ff" stroke="#0E72ED" stroke-width="3"/><text x="65" y="36" font-family="'Noto Sans TC',sans-serif" font-size="15" font-weight="900" fill="#1f5fb0" text-anchor="middle">改名</text><rect x="20" y="52" width="90" height="20" rx="6" fill="#f3ece2"/><text x="65" y="66" font-family="'Noto Sans TC',sans-serif" font-size="11" fill="#9a8a74" text-anchor="middle">設定大頭貼</text></svg>`} style={{ padding: '20px 12px 14px' }} />
          <ZgCard n={4} title="改成學號＋拼音" html={`<svg viewBox="0 0 130 86" width="120" height="80" style="display:block;margin:0 auto 6px"><rect x="8" y="6" width="114" height="74" rx="12" fill="#fff" stroke="#5e4b3c" stroke-width="3"/><text x="65" y="26" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="900" fill="#3a2f25" text-anchor="middle">輸入新名字</text><rect x="16" y="34" width="98" height="30" rx="8" fill="#fffdf7" stroke="#1f8a5b" stroke-width="3"/><text x="65" y="54" font-family="'Noto Sans TC',sans-serif" font-size="14" font-weight="900" fill="#2f7d57" text-anchor="middle">A8＋Shun Li</text></svg>`} style={{ padding: '20px 12px 14px' }} />
        </div>
      </ZgArt>

      {/* WARNING: 不要點舉手 */}
      <article style={{ background: '#f6efe1', border: '1px solid #e3d9c6', borderRadius: 14, padding: '22px 26px', margin: '22px 0', boxShadow: '0 1px 3px rgba(60,50,40,.05)', display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ lineHeight: 0, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 110 110" style="width:96px;height:96px" aria-label="不要點舉手"><circle cx="55" cy="55" r="50" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><path d="M48 78V44c0-5 4-9 9-9s9 4 9 9v-3c0-5 4-8 8-8s8 3 8 8v5c0-4 4-7 8-7s8 3 8 8v22c0 16-11 28-29 28-12 0-20-6-25-15l-12-20c-3-5 4-11 9-7z" fill="#f2b8a8" stroke="#5e4b3c" stroke-width="3" stroke-linejoin="round" transform="translate(-8 -2)"/><circle cx="40" cy="40" r="22" fill="none" stroke="#ef6b5a" stroke-width="7"/><path d="M25 25l30 30" stroke="#ef6b5a" stroke-width="7" stroke-linecap="round"/></svg>` }} />
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#c0463a' }}>課程期間：不要點「舉手」</h4>
          <p style={{ margin: 0, fontSize: 17, color: '#4f4032' }}>課程期間請勿點擊「<strong>舉手</strong>」，以免影響其他師兄聽法。</p>
        </div>
      </article>
    </>
  )
}

// ── Interpret Section ──────────────────────────────────────────
function InterpretSection() {
  const noteStyle: React.CSSProperties = { background: '#f1f6ef', border: '2.5px solid #7fb89b', borderRadius: 14, padding: '12px 14px', fontSize: 15.5, color: '#3f6450' }

  return (
    <>
      {/* 手機端 */}
      <ZgArt>
        <ZgH3>手機端</ZgH3>
        <ZgP>點擊「<strong>更多</strong>」→ 點擊「<strong>口譯</strong>」→ <strong>選擇所需要的語言</strong>。</ZgP>
        <ZgP mb={14}>可選語言包含：主音訊、英語、中文、泰語。</ZgP>
        <div style={noteStyle}><strong style={{ color: '#2f7d57' }}>補充提醒：</strong>若找不到「口譯」，可能是主持人尚未開啟口譯（同聲傳譯）功能；若聽不到聲音，先確認 Zoom 語音已連接、手機音量與耳機連線正常。</div>
        <div className="zg3">
          <ZgCard n={1} title="點「更多」" sub="控制列右下角 ···" html={`<svg viewBox="0 0 150 200" width="120" style="display:block;margin:0 auto"><rect x="4" y="4" width="142" height="192" rx="24" fill="#cdb88f"/><rect x="0" y="0" width="142" height="192" rx="24" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><rect x="12" y="20" width="118" height="130" rx="12" fill="#2d2a33"/><circle cx="71" cy="64" r="22" fill="#cfd6e0"/><path d="M40 110c10-26 52-26 62 0z" fill="#cfd6e0"/><rect x="12" y="150" width="118" height="34" rx="10" fill="#17151c"/><circle cx="36" cy="167" r="3.2" fill="#9aa3b0"/><circle cx="47" cy="167" r="3.2" fill="#9aa3b0"/><circle cx="58" cy="167" r="3.2" fill="#9aa3b0"/><text x="86" y="172" font-family="'Noto Sans TC',sans-serif" font-size="12" font-weight="700" fill="#fff">更多</text><circle cx="98" cy="167" r="17" fill="none" stroke="#97a06a" stroke-width="4"/></svg>`} style={{ padding: '20px 14px 16px' }} />
          <ZgCard n={2} title="點「口譯」" sub="地球圖示" html={`<svg viewBox="0 0 160 200" width="128" style="display:block;margin:0 auto"><rect x="4" y="4" width="152" height="192" rx="24" fill="#cdb88f"/><rect x="0" y="0" width="152" height="192" rx="24" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><rect x="12" y="20" width="128" height="160" rx="12" fill="#2d2a33"/><g font-family="'Noto Sans TC',sans-serif" font-size="10" fill="#e9e1d2" text-anchor="middle"><circle cx="46" cy="60" r="15" fill="#3a3742"/><text x="46" y="88">參與者</text><circle cx="106" cy="60" r="15" fill="#3a3742"/><text x="106" y="88">共享</text><circle cx="46" cy="124" r="15" fill="#3a3742"/><text x="46" y="152">聊天</text><circle cx="106" cy="124" r="18" fill="#a7a36a"/><circle cx="106" cy="124" r="8" fill="none" stroke="#fff" stroke-width="2"/><path d="M98 124h16M106 116c5 5 5 11 0 16M106 116c-5 5-5 11 0 16" stroke="#fff" stroke-width="1.5" fill="none"/><text x="106" y="160" fill="#fff" font-weight="700">口譯</text></g><circle cx="106" cy="124" r="25" fill="none" stroke="#97a06a" stroke-width="4" stroke-dasharray="8 6"/></svg>`} style={{ padding: '20px 14px 16px' }} />
          <ZgCard n={3} title="選擇語言" sub="主音訊／英／中／泰" html={`<svg viewBox="0 0 150 200" width="120" style="display:block;margin:0 auto"><rect x="4" y="4" width="142" height="192" rx="24" fill="#cdb88f"/><rect x="0" y="0" width="142" height="192" rx="24" fill="#fff" stroke="#5e4b3c" stroke-width="4.5"/><rect x="14" y="22" width="114" height="156" rx="12" fill="#fffdf7" stroke="#d4c2a6" stroke-width="2.5"/><text x="71" y="46" font-family="'Noto Sans TC',sans-serif" font-size="14" font-weight="900" fill="#3a2f25" text-anchor="middle">口譯</text><text x="28" y="74" font-family="'Noto Sans TC',sans-serif" font-size="13" fill="#6f5a49">主音訊</text><text x="114" y="74" font-size="13" fill="#1f8a5b" text-anchor="end">✓</text><text x="28" y="100" font-family="'Noto Sans TC',sans-serif" font-size="13" fill="#6f5a49">英語</text><rect x="22" y="110" width="94" height="28" rx="8" fill="#fdeee6" stroke="#97a06a" stroke-width="2.5"/><text x="32" y="129" font-family="'Noto Sans TC',sans-serif" font-size="13" font-weight="700" fill="#7f8a55">中文</text><text x="108" y="129" font-size="13" fill="#1f8a5b" text-anchor="end">✓</text><text x="28" y="162" font-family="'Noto Sans TC',sans-serif" font-size="13" fill="#6f5a49">泰語</text></svg>`} style={{ padding: '20px 14px 16px' }} />
        </div>
      </ZgArt>

      {/* 電腦端 */}
      <ZgArt>
        <ZgH3>電腦端</ZgH3>
        <ZgP mb={14}>點擊「<strong>更多</strong>」→ 點擊「<strong>口譯</strong>」→ <strong>選擇所需要的語言</strong>。</ZgP>
        <div style={noteStyle}><strong style={{ color: '#2f7d57' }}>補充提醒：</strong>如果控制列上直接有地球圖示的「口譯」，可直接點選。需要原聲時，可回到語言選單選「主音訊」。</div>
        <div className="zg3">
          <ZgCard n={1} title="看下方控制列" sub="視窗底部那一排" html={`<svg viewBox="0 0 230 150" width="100%" style="display:block;margin:0 auto;max-width:230px"><rect x="6" y="10" width="218" height="130" rx="14" fill="#26242b" stroke="#5e4b3c" stroke-width="4"/><rect x="20" y="22" width="190" height="74" rx="8" fill="#3a3742"/><circle cx="115" cy="52" r="17" fill="#55525d"/><path d="M93 86c4-16 40-16 44 0z" fill="#55525d"/><rect x="30" y="104" width="170" height="26" rx="9" fill="#17151c"/><g font-family="'Noto Sans TC',sans-serif" font-size="8" fill="#e9e1d2" text-anchor="middle"><text x="52" y="121">靜音</text><text x="92" y="121">視訊</text><text x="132" y="121">參與者</text><text x="178" y="121">更多 ···</text></g></svg>`} style={{ padding: '20px 14px 16px' }} />
          <ZgCard n={2} title="點「更多」或「口譯」" sub="地球圖示" html={`<svg viewBox="0 0 200 150" width="100%" style="display:block;margin:0 auto;max-width:200px"><rect x="10" y="50" width="180" height="50" rx="13" fill="#17151c"/><g font-family="'Noto Sans TC',sans-serif" font-size="11" fill="#e9e1d2" text-anchor="middle"><circle cx="58" cy="70" r="16" fill="#a7a36a"/><circle cx="58" cy="70" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="M49 70h18M58 61c5 5 5 13 0 18M58 61c-5 5-5 13 0 18" stroke="#fff" stroke-width="1.5" fill="none"/><text x="58" y="96" fill="#ffd9c2" font-weight="700">口譯</text><text x="140" y="68" font-size="18" fill="#e9e1d2">···</text><text x="140" y="96">更多</text></g><circle cx="58" cy="70" r="24" fill="none" stroke="#97a06a" stroke-width="4" stroke-dasharray="8 6"/></svg>`} style={{ padding: '20px 14px 16px' }} />
          <ZgCard n={3} title="選擇語言" sub="需要原聲選「主音訊」" html={`<svg viewBox="0 0 150 150" width="100%" style="display:block;margin:0 auto;max-width:140px"><rect x="14" y="10" width="122" height="130" rx="12" fill="#fff" stroke="#5e4b3c" stroke-width="3.5"/><text x="30" y="40" font-family="'Noto Sans TC',sans-serif" font-size="14" fill="#6f5a49">主音訊</text><text x="120" y="40" font-size="14" fill="#1f8a5b" text-anchor="end">✓</text><text x="30" y="68" font-family="'Noto Sans TC',sans-serif" font-size="14" fill="#6f5a49">英語</text><rect x="22" y="78" width="106" height="30" rx="9" fill="#fdeee6" stroke="#97a06a" stroke-width="2.5"/><text x="34" y="98" font-family="'Noto Sans TC',sans-serif" font-size="14" font-weight="700" fill="#7f8a55">中文</text><text x="120" y="98" font-size="14" fill="#1f8a5b" text-anchor="end">✓</text><text x="30" y="130" font-family="'Noto Sans TC',sans-serif" font-size="14" fill="#6f5a49">泰語</text></svg>`} style={{ padding: '20px 14px 16px' }} />
        </div>
      </ZgArt>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────
function ZoomGuideContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const [auth, setAuth] = useState<AuthState>('loading')
  const [tab, setTab] = useState<Tab>('equipment')

  useEffect(() => {
    if (!id || !code) { setAuth('need_login'); return }
    fetch(`/api/member/me?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        if (!r.ok) { setAuth('need_login'); return }
        const d = await r.json()
        if (d.status !== 'approved') { setAuth('not_approved'); return }
        setAuth('ok')
      })
      .catch(() => setAuth('need_login'))
  }, [id, code])

  const backUrl = id && code
    ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`
    : '/member'

  const fgOn = '#5a6a37', fgOff = '#9a8d74'
  const lineOn = '3px solid #7d8b4f'
  const lineOff = '3px solid transparent'

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" /><div className="page-blob b2" /><div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href="/" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
          </a>
          <a href={backUrl} className="nav-back">← 返回學員專區</a>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
            <span style={{ width: 34, height: 1, background: '#bcae93', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-noto-serif-tc),"Noto Serif TC",serif', fontStyle: 'italic', letterSpacing: '.32em', fontSize: 13, color: '#8a7c5f' }}>ZOOM&nbsp;&nbsp;GUIDE</span>
            <span style={{ width: 34, height: 1, background: '#bcae93', display: 'inline-block' }} />
          </div>
          <h1 className="page-title">Zoom 使用指南</h1>
          <p className="page-subtitle">Zoom 下載、加入步驟與口譯（同聲傳譯）設定，請於課程開始前詳閱。</p>
        </div>
      </div>

      {auth === 'loading' && (
        <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}>
          <div className="spinner-large" />
        </div>
      )}
      {auth === 'need_login' && (
        <main className="container" style={{ paddingBottom: 80, position: 'relative', zIndex: 1 }}>
          <div className="schedule-card" style={{ padding: '32px 28px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 16 }}>請先登入學員專區再查閱本頁。</p>
            <a href="/member" style={{ color: 'var(--gold)', fontWeight: 600 }}>前往登入 →</a>
          </div>
        </main>
      )}
      {auth === 'not_approved' && (
        <main className="container" style={{ paddingBottom: 80, position: 'relative', zIndex: 1 }}>
          <div className="schedule-card" style={{ padding: '32px 28px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-soft)' }}>本頁僅限錄取學員查閱。</p>
          </div>
        </main>
      )}

      {auth === 'ok' && (
        <>
          {/* Shared SVG gradient/pattern defs */}
          <div dangerouslySetInnerHTML={{ __html: SHARED_DEFS }} />

          {/* Sticky tab nav */}
          <nav className="zg-nav" aria-label="手冊分頁" style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: 'rgba(242,235,221,.9)', backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderBottom: '1px solid #ddd1bb', marginBottom: 8,
          }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 22px', display: 'flex', gap: 6 }}>
              {([
                ['equipment', '設備準備清單'],
                ['download', '下載與加入會議'],
                ['interpret', '口譯（同聲傳譯）'],
              ] as [Tab, string][]).map(([key, label]) => (
                <button key={key}
                  onClick={() => { setTab(key); try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (_) {} }}
                  style={{
                    border: 'none', background: 'none',
                    borderBottom: tab === key ? lineOn : lineOff,
                    padding: '16px 18px 13px',
                    color: tab === key ? fgOn : fgOff,
                    fontFamily: 'inherit',
                    fontWeight: tab === key ? 700 : 500,
                    fontSize: 17,
                    cursor: 'pointer',
                    letterSpacing: '.02em',
                    transition: 'color .15s',
                    whiteSpace: 'nowrap',
                  }}
                >{label}</button>
              ))}
            </div>
          </nav>

          <main style={{ maxWidth: 1180, margin: '0 auto 64px', padding: '0 22px', position: 'relative', zIndex: 1 }}>
            {tab === 'equipment' && <EquipmentSection />}
            {tab === 'download' && <DownloadSection />}
            {tab === 'interpret' && <InterpretSection />}
          </main>
        </>
      )}
    </>
  )
}

export default function ZoomGuidePage() {
  return (
    <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><div className="spinner-large" /></div>}>
      <ZoomGuideContent />
    </Suspense>
  )
}
