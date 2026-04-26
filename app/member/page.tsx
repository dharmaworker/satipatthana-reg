'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MemberLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', random_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
          <div className="login-icon">心</div>
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
          <div>© 2026 台灣四念處禪修學會　All rights reserved.</div>
          <div><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></div>
        </div>
      </footer>
    </>
  )
}
