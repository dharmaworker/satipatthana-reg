'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'admin_remember'

export default function AdminLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { username, password } = JSON.parse(saved)
        setForm({ username: username || '', password: password || '' })
        setRemember(true)
      }
    } catch {}
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ username: form.username, password: form.password }))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      router.push(data.role === 'practice_editor' ? '/admin/practice' : '/admin/dashboard')
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
        <form className="login-card" onSubmit={e => { e.preventDefault(); handleLogin() }}>
          <div className="login-icon" style={{ background: 'linear-gradient(135deg, var(--green-soft), var(--green-deep))' }}>管</div>
          <div className="login-kicker">Admin Console · 後台管理</div>
          <h1 className="login-title">後台管理系統</h1>
          <p className="login-subtitle">第二屆台灣四念處禪修</p>

          {error && <div className="login-error">⚠ {error}</div>}

          <div className="login-form">
            <div className="form-grid-1">
              <div className="form-field">
                <label className="form-label">帳號 <span className="en">Username</span></label>
                <input className="form-input" required autoComplete="username"
                  value={form.username}
                  onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">密碼 <span className="en">Password</span></label>
                <input type="password" className="form-input" required autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
              <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }} />
              <label htmlFor="remember" style={{ fontSize: 13, color: 'var(--ink-soft)', cursor: 'pointer' }}>記住我（下次自動填入）</label>
            </div>
            <div className="login-actions">
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '登入中⋯' : '登入後台'} <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </form>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處學會　All rights reserved.</div>
          <div><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></div>
        </div>
      </footer>
    </>
  )
}
