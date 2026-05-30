'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'
import { getQuicktestDeadline1Ms, getQuicktestDeadline2Ms, msToDayLabel, msToTimeLabel, ScheduleConfig } from '@/lib/registration-period'

function QuickTestsSuccessContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const dashboardUrl = id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'

  const [schedCfg, setSchedCfg] = useState<ScheduleConfig | null>(null)
  useEffect(() => {
    fetch('/api/phase-config').then(r => r.json()).then(d => setSchedCfg(d)).catch(() => {})
  }, [])

  const qt1Ms = getQuicktestDeadline1Ms(schedCfg)
  const qt2Ms = getQuicktestDeadline2Ms(schedCfg)
  const qt1Day = msToDayLabel(qt1Ms)
  const qt2Day = msToDayLabel(qt2Ms)
  const qt1Time = msToTimeLabel(qt1Ms)
  const qt2Time = msToTimeLabel(qt2Ms)

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
          <h1 className="success-title">快篩上傳已收到</h1>
          <p className="success-desc">
            系統已寄出確認信至您的 Email，請注意查收（含垃圾郵件）。<br />
            未上傳的時段請於規定時間前回到此頁補上。
          </p>

          <div className="success-next">
            <h5>快篩時程提醒</h5>
            <ol>
              <li><strong>{qt1Day}</strong>上午 8 點 ～ {qt1Time}前上傳</li>
              <li><strong>{qt2Day}</strong> {qt2Time}前上傳</li>
              <li><strong>8/20、8/22 課程期間</strong>快篩請於現場繳交，毋須線上上傳</li>
            </ol>
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

export default function QuickTestsSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <QuickTestsSuccessContent />
    </Suspense>
  )
}
