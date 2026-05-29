'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'
import { payDeadlineFor, isLateRegOpen } from '@/lib/registration-period'

function LodgingSuccessContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const edited = searchParams.get('edited') === '1'
  const dashboardUrl = id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'
  const mainPay = payDeadlineFor('open')
  const latePay = payDeadlineFor('late')
  const showLatePay = isLateRegOpen()

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
          <h1 className="success-title">食宿登記已送出</h1>
          <p className="success-desc">
            系統已寄出確認信至您的 Email，請注意查收（含垃圾郵件）。<br />
            {edited
              ? '本表單已修改過一次，無法再修改。若需更動請聯絡學會。'
              : '如需修改僅能再修改一次（6/20 晚上 8 點前），修改後即無法再動。'}
          </p>

          <div className="success-next">
            <h5>接下來</h5>
            <ol>
              <li>繳費通知將於錄取後透過 E-mail 發送</li>
              <li>錄取者請於繳費截止前完成繳費：主報名 <strong>{mainPay.full} 晚上 8 點前</strong>{showLatePay && <>；補報名 <strong>{latePay.full} 晚上 8 點前</strong></>}</li>
              <li>可隨時至 <a href={dashboardUrl} style={{ color: 'var(--green)', fontWeight: 700 }}>學員專區</a> 查詢審核狀態</li>
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

export default function LodgingSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <LodgingSuccessContent />
    </Suspense>
  )
}
