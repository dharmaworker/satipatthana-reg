'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

const img = (file: string) => SITE_ASSETS.zoomGuide(file)

type AuthState =
  | { kind: 'loading' }
  | { kind: 'need_login' }
  | { kind: 'not_approved' }
  | { kind: 'ok' }

const TABS = ['設備準備', '下載安裝', '加入與設定'] as const
type TabIdx = 0 | 1 | 2

function ZoomGuideContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const [auth, setAuth] = useState<AuthState>({ kind: 'loading' })
  const [tab, setTab] = useState<TabIdx>(0)

  useEffect(() => {
    if (!id || !code) { setAuth({ kind: 'need_login' }); return }
    fetch(`/api/member/me?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        if (!r.ok) { setAuth({ kind: 'need_login' }); return }
        const d = await r.json()
        if (d.status !== 'approved') { setAuth({ kind: 'not_approved' }); return }
        setAuth({ kind: 'ok' })
      })
      .catch(() => setAuth({ kind: 'need_login' }))
  }, [id, code])

  const backUrl = id && code
    ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`
    : '/member'

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
          <p className="page-kicker">Zoom Guide</p>
          <h1 className="page-title">Zoom 使用指南</h1>
          <p className="page-subtitle">Zoom 下載、加入步驟與同聲傳譯設定，請於課程開始前詳閱。</p>
        </div>
      </div>

      <main className="container" style={{ paddingBottom: 80, position: 'relative', zIndex: 1, maxWidth: 760 }}>
        {auth.kind === 'loading' && (
          <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}>
            <div className="spinner-large" />
          </div>
        )}

        {auth.kind === 'need_login' && (
          <div className="schedule-card" style={{ padding: '32px 28px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 16 }}>請先登入學員專區再查閱本頁。</p>
            <a href="/member" style={{ color: 'var(--gold)', fontWeight: 600 }}>前往登入 →</a>
          </div>
        )}

        {auth.kind === 'not_approved' && (
          <div className="schedule-card" style={{ padding: '32px 28px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-soft)' }}>本頁僅限錄取學員查閱。</p>
          </div>
        )}

        {auth.kind === 'ok' && (
          <div className="schedule-card">
            <div className="schedule-tabs">
              {TABS.map((label, i) => (
                <button key={i}
                  className={`schedule-tab ${tab === i ? 'active' : ''}`}
                  onClick={() => setTab(i as TabIdx)}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px 24px 20px' }}>

              {/* ── Tab 0: 設備準備 ── */}
              {tab === 0 && (
                <div>
                  <p style={textStyle}>參與課程前，請依照以下清單確認設備準備是否完善。</p>
                  <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: '網路', content: '建議準備 2 條網路線路（手機流量 + Wi-Fi），設備盡量不開其他應用程式。電腦建議以有線（網路線）連接路由器，最為穩定。' },
                      { label: '電源', content: '線上時間較長，手機／平板請提前充飽電並備好行動電源、充電線；筆記型電腦建議全程接電源，不用電池。請注意電費繳納，避免中途斷電。' },
                      { label: '軟體', content: '請提前下載並安裝 Zoom 客戶端（勿使用網頁版），詳見「下載安裝」頁籤。' },
                      { label: '鏡頭', content: '保持與螢幕平視，以示對老師的尊重；不俯視、不仰視（長時間仰視頸部容易不舒服）。手機／平板請橫屏擺放。建議準備支架或可墊高的物品，避免鏡頭晃動。' },
                      { label: '散熱', content: '長時間使用設備容易過熱，導致訊號下降或黑屏退出 Zoom。建議提前準備散熱器、散熱支架或小風扇。' },
                      { label: '儀容坐姿', content: '以示尊重，請勿穿著無袖背心，女生不穿低胸衣服。活動每日在線時間較長，建議選擇舒適坐姿，讓身心放鬆。' },
                    ].map((row, i) => (
                      <div key={i} style={{
                        borderTop: i === 0 ? '1px solid var(--line)' : undefined,
                        borderBottom: '1px solid var(--line)',
                        borderLeft: '1px solid var(--line)',
                        borderRight: '1px solid var(--line)',
                        padding: '10px 14px',
                        background: i % 2 === 0 ? 'var(--bg-warm)' : undefined,
                      }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{row.label}</p>
                        <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.7 }}>{row.content}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ ...textStyle, marginTop: 8, color: 'var(--ink-mute)', fontSize: 13 }}>下圖為詳細圖文說明：</p>
                  <GuideImg src={img('equip-2.jpg')} alt="網路與電源準備說明" />
                  <GuideImg src={img('equip-3.jpg')} alt="鏡頭與散熱準備說明" />
                </div>
              )}

              {/* ── Tab 1: 下載安裝 ── */}
              {tab === 1 && (
                <div>
                  <SubTitle>電腦版（Windows / Mac）</SubTitle>
                  <p style={textStyle}>在瀏覽器輸入以下網址，點擊「下載」安裝 Zoom Workplace（請勿下載網頁版）：</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>台灣／港澳</span>
                      <a href="https://zoom.us/zh-tw/download" target="_blank" rel="noopener noreferrer"
                        style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14, wordBreak: 'break-all' }}>
                        https://zoom.us/zh-tw/download
                      </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>大陸</span>
                      <a href="https://zoom.us/zh-cn/download" target="_blank" rel="noopener noreferrer"
                        style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14, wordBreak: 'break-all' }}>
                        https://zoom.us/zh-cn/download
                      </a>
                    </div>
                  </div>
                  <GuideImg src={img('guide-01.jpg')} alt="電腦版 Zoom 下載" />

                  <SubTitle>手機 / 平板 — iOS（iPhone / iPad）</SubTitle>
                  <p style={textStyle}>直接在 App Store 搜尋下載「<strong>Zoom Cloud Meetings</strong>」。</p>
                  <GuideImg src={img('guide-02.jpg')} alt="iOS 與 Android 下載說明" />

                  <SubTitle>手機 / 平板 — Android（華為、小米、vivo 等）</SubTitle>
                  <p style={textStyle}>在瀏覽器地址列輸入 <strong>zoom.us/download</strong>，選擇「從 Zoom 網站下載」，下載完成後選擇「打開並安裝」。</p>
                  <GuideImg src={img('guide-03.jpg')} alt="Android 瀏覽器下載" />
                  <GuideImg src={img('guide-04.jpg')} alt="Android 安裝步驟" />
                  <GuideImg src={img('guide-05.jpg')} alt="Android 安裝成功" />

                  <SubTitle>特殊情況 1：無法訪問 Zoom 網站</SubTitle>
                  <p style={textStyle}>若瀏覽器顯示「已停止訪問此網頁」，請改用百度搜尋 <strong>zoom.us/download</strong> 進入下載頁。</p>
                  <GuideImg src={img('guide-06.jpg')} alt="無法訪問 Zoom 網站的處理方式" />

                  <SubTitle>特殊情況 2：下載成功但無法安裝</SubTitle>
                  <p style={textStyle}>
                    <strong>華為手機：</strong>需關閉「純淨模式」。進入「設定」→「系統與更新」→「純淨模式」→ 關閉「增強防護」。<br />
                    <strong>其他 Android：</strong>在設定中找到「安全」或「隱私」選項，開啟「允許安裝未知來源應用程式」。
                  </p>
                  <GuideImg src={img('guide-07.jpg')} alt="華為純淨模式關閉" />
                  <GuideImg src={img('guide-08.jpg')} alt="其他 Android 安裝設定" />
                </div>
              )}

              {/* ── Tab 2: 加入與設定 ── */}
              {tab === 2 && (
                <div>
                  <p style={{ ...textStyle, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>加入 Zoom 會議步驟</p>
                  <Step n={1} text='打開 Zoom 客戶端，直接點擊「加入會議」。（大陸用戶：請勿點擊「登錄」）' />
                  <GuideImg src={img('guide-09.jpg')} alt="開啟 Zoom 點擊加入會議" />

                  <Step n={2} text='第一欄輸入「會議號」，第二欄輸入「學號 + 姓名拼音／英文名」，例如：1001+Shun Li，再點擊「加入會議」。' />
                  <GuideImg src={img('guide-10.jpg')} alt="輸入會議號與名字" />

                  <Step n={3} text='輸入會議密碼，點擊「確定」。' />
                  <GuideImg src={img('guide-11.jpg')} alt="輸入會議密碼" />

                  <Step n={4} text='進入會議室後，若聽不到聲音，點擊「連接語音」→「Wi-Fi 或行動數據」。' />
                  <GuideImg src={img('guide-12.jpg')} alt="連接語音" />

                  <Step n={5} text='「開啟視頻」請保持關閉（全員不開鏡）。若名字有誤，點擊「參會者」→ 自己的名字 → 「改名」，改為「學號 + 姓名拼音／英文名」。' />
                  <GuideImg src={img('guide-13.jpg')} alt="視頻關閉與改名" />

                  <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                    <p style={{ ...textStyle, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>同聲傳譯設定</p>
                    <p style={textStyle}>課程提供中文、英語等多語言同聲傳譯。進入會議室後，依照以下步驟切換語言頻道：</p>

                    <SubTitle>手機端</SubTitle>
                    <p style={textStyle}>點擊「更多」→「傳譯」→ 選擇所需語言（中文、英語、粵語、泰語）。</p>
                    <GuideImg src={img('interp-1.jpg')} alt="手機端同聲傳譯設定" />

                    <SubTitle>電腦端</SubTitle>
                    <p style={textStyle}>點擊「更多」→「傳譯」→ 選擇所需語言。</p>
                    <GuideImg src={img('interp-2.jpg')} alt="電腦端同聲傳譯設定" />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>
    </>
  )
}

// ── helpers ──

const textStyle: React.CSSProperties = { margin: '0 0 10px', color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.75 }

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '18px 0 6px', fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{children}</p>
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, margin: '10px 0 4px', alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
        background: 'var(--gold)', color: '#fff', fontSize: 12, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
      }}>{n}</span>
      <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.75 }}>{text}</p>
    </div>
  )
}


function GuideImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ margin: '10px 0 14px' }}>
      <img src={src} alt={alt} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--line)' }} loading="lazy" />
    </div>
  )
}

export default function ZoomGuidePage() {
  return (
    <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><div className="spinner-large" /></div>}>
      <ZoomGuideContent />
    </Suspense>
  )
}
