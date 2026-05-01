'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

const STORAGE_KEY = 'member_remember'

export default function MemberLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', random_code: '' })
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { email, code } = JSON.parse(saved)
        setForm({ email: email || '', random_code: code || '' })
        setRemember(true)
      }
    } catch {}
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: form.email, code: form.random_code }))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      router.push(`/member/dashboard?id=${data.id}&code=${encodeURIComponent(data.code)}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

      <main className="login-wrap">
        <div className="login-card">
          <div className="login-kicker">Member Portal · 學員專區</div>
          <h1 className="login-title">學員專區登入</h1>
          <p className="login-subtitle">
            請輸入您報名時所填寫的 E-mail 與專屬代碼。<br />
            專屬代碼可於報名確認信／錄取通知信中查找。
          </p>

          {error && <div className="login-error">⚠ {error}</div>}

          <form className="login-form" onSubmit={e => { e.preventDefault(); handleLogin() }}>
            <div className="form-grid-1">
              <div className="form-field">
                <label className="form-label">電子信箱 <span className="required">*</span><span className="en">Email</span></label>
                <input type="email" className="form-input" required autoComplete="email"
                  placeholder="您報名時所填寫的 Email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">專屬代碼 <span className="required">*</span><span className="en">Access Code</span></label>
                <input className="form-input uppercase" required maxLength={12} autoComplete="off"
                  placeholder="例：MMN85PUN"
                  value={form.random_code}
                  onChange={e => setForm(prev => ({ ...prev, random_code: e.target.value.toUpperCase() }))} />
                <span className="form-hint">請參考錄取通知信中的專屬代碼，不分大小寫。</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
              <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }} />
              <label htmlFor="remember" style={{ fontSize: 13, color: 'var(--ink-soft)', cursor: 'pointer' }}>記住我（下次自動填入）</label>
            </div>
            <div className="login-actions">
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '登入中⋯' : '進入學員專區'} <span className="arrow">→</span>
              </button>
            </div>
          </form>

          <div className="help-link">
            遺失專屬代碼？<a href="mailto:satipatthana.tw@gmail.com">寫信給我們</a>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處學會　All rights reserved.</div>
          <div>
            <h5 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'rgba(251,248,242,0.9)', letterSpacing: '0.1em' }}>聯絡我們</h5>
            <div style={{ marginBottom: 12 }}><a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'rgba(251,248,242,0.75)', fontSize: 13 }}>satipatthana.tw@gmail.com</a></div>
            <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.2)' }} />
            <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>請加入學會LINE官方帳號洽詢</p>
          </div>
        </div>
      </footer>
    </>
  )
}
