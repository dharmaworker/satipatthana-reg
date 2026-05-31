'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'
import { getPhaseCopyWithConfig, msToTimeLabel, ScheduleConfig } from '@/lib/registration-period'

function SuccessContent() {
  const searchParams = useSearchParams()
  const isOnline = searchParams.get('format') === 'online'
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const dashboardUrl = id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'

  const [schedCfg, setSchedCfg] = useState<ScheduleConfig | null>(null)
  useEffect(() => {
    fetch('/api/phase-config').then(r => r.json()).then(d => setSchedCfg(d)).catch(() => {})
  }, [])

  const copy = getPhaseCopyWithConfig(schedCfg)

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href="/" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
          </a>
          <a href="/" className="nav-back">← 返回首頁</a>
        </div>
      </header>

      <main className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="success-card">
          <h1 className="success-title">
            {isOnline ? '線上課程報名成功' : '實體課程報名成功'}
          </h1>
          <p className="success-desc">
            {isOnline
              ? <>感謝您報名「第二屆台灣四念處禪修線上課程（Zoom）」。<br />系統已將報名資訊發送至您的電子信箱，請注意查收（包括垃圾郵件）。</>
              : <>感謝您報名「第二屆台灣四念處禪修實體課程」。<br />系統已將報名資訊發送至您的電子信箱，請注意查收（包括垃圾郵件）。</>
            }
          </p>

          <div className="success-next">
            <h5>接下來</h5>
            {isOnline ? (
              <ol>
                <li>錄取通知將於 <strong>{copy.notifyLabel}</strong> 透過 E-mail 發送</li>
                <li>課程方式：<strong>線上 Zoom 視訊</strong></li>
                <li>課程日期：<strong>2026/08/20 ～ 08/24</strong></li>
                <li>Zoom 連結及課程時程將於錄取後另行寄信通知</li>
                <li>可隨時至 <a href={dashboardUrl} style={{ color: 'var(--green)', fontWeight: 700 }}>學員專區</a> 查詢審核狀態</li>
              </ol>
            ) : (
              <ol>
                <li>錄取通知將於 <strong>{copy.notifyLabel}</strong> 透過 E-mail 發送</li>
                <li>錄取者請於 <strong>{copy.payDeadlineFull} {copy.payDeadlineMs ? msToTimeLabel(copy.payDeadlineMs) : '晚上 8 點'}前</strong>完成繳費</li>
                <li>課程日期：<strong>2026/08/20 ～ 08/24</strong>（南投・日月潭）</li>
                <li>可隨時至 <a href={dashboardUrl} style={{ color: 'var(--green)', fontWeight: 700 }}>學員專區</a> 查詢審核狀態</li>
              </ol>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={dashboardUrl} className="btn btn-primary">前往學員專區 <span className="arrow">→</span></a>
            <a href="/" className="btn btn-ghost">返回首頁</a>
          </div>

          <p style={{ marginTop: 28, fontSize: 13, color: 'var(--ink-mute)' }}>
            台灣四念處學會 🙏
          </p>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處學會　All rights reserved.</div>
          <div>
            <h5 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'rgba(251,248,242,0.9)', letterSpacing: '0.1em' }}>聯絡我們</h5>
            <div style={{ marginBottom: 12 }}><a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'rgba(251,248,242,0.75)', fontSize: 14 }}>satipatthana.tw@gmail.com</a></div>
            <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.2)' }} />
            <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>請加入學會LINE官方帳號洽詢</p>
          </div>
        </div>
      </footer>
    </>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
