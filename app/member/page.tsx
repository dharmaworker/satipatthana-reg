'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

const STORAGE_KEY = 'member_remember'

export default function MemberLoginPage() {
  const router = useRouter()
  const [loginMode, setLoginMode] = useState<'password' | 'code'>('code')
  const [form, setForm] = useState({ email: '', random_code: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showResend, setShowResend] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [resendError, setResendError] = useState('')

  const handleResend = async () => {
    if (!resendEmail.trim()) { setResendError('請填寫您報名時的電子信箱'); return }
    setResendLoading(true); setResendError('')
    try {
      const res = await fetch('/api/member/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResendDone(true)
    } catch (err: any) {
      setResendError(err.message || '寄信失敗，請稍後再試')
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { email, code } = JSON.parse(saved)
        setForm({ email: email || '', random_code: code || '', password: '' })
        setRemember(true)
      }
    } catch {}
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const body = loginMode === 'password'
        ? { email: form.email, password: form.password }
        : { email: form.email, random_code: form.random_code }
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: form.email, code: data.code }))
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
            {loginMode === 'password'
              ? <>請輸入您報名時所填寫的 E-mail 與登入密碼。<br />預設密碼為手機號碼末4碼。</>
              : <>請輸入您報名時所填寫的 E-mail 與專屬代碼。<br />專屬代碼可於報名確認信／錄取通知信中查找。</>}
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
              {loginMode === 'password' ? (
                <div className="form-field">
                  <label className="form-label">密碼 <span className="required">*</span><span className="en">Password</span></label>
                  <input type="password" className="form-input" required autoComplete="current-password"
                    placeholder="預設為手機號碼末4碼"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} />
                  <span className="form-hint">尚未設定密碼者，預設密碼為手機號碼末4碼。</span>
                </div>
              ) : (
                <div className="form-field">
                  <label className="form-label">專屬代碼 <span className="required">*</span><span className="en">Access Code</span></label>
                  <input className="form-input uppercase" required maxLength={12} autoComplete="off"
                    placeholder="例：MMN85PUN"
                    value={form.random_code}
                    onChange={e => setForm(prev => ({ ...prev, random_code: e.target.value.toUpperCase() }))} />
                  <span className="form-hint">請參考錄取通知信中的專屬代碼，不分大小寫。</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 4 }}>
              <button type="button" onClick={() => { setLoginMode(m => m === 'password' ? 'code' : 'password'); setError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}>
                {loginMode === 'password' ? '改用專屬代碼登入' : '改用密碼登入'}
              </button>
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
            遺失專屬代碼？
            <button type="button" onClick={() => { setShowResend(v => !v); setResendDone(false); setResendError('') }}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline', padding: 0 }}>
              點此重新寄送
            </button>
          </div>

          {showResend && (
            <div style={{ marginTop: 16, padding: '16px 20px', background: 'rgba(180,147,88,0.08)', borderRadius: 12, border: '1px solid rgba(180,147,88,0.25)' }}>
              {resendDone ? (
                <p style={{ margin: 0, fontSize: 14, color: '#495534', textAlign: 'center' }}>
                  ✓ 若此信箱有報名紀錄，專屬代碼已寄出，請查收信件（含垃圾郵件）。
                </p>
              ) : (
                <>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-soft)' }}>
                    填寫您報名時所填的信箱，系統將把專屬代碼寄到該信箱。
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="報名時填的 Email"
                      value={resendEmail}
                      onChange={e => { setResendEmail(e.target.value); setResendError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleResend()}
                      style={{ flex: 1, fontSize: 14 }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleResend} disabled={resendLoading}
                      style={{ whiteSpace: 'nowrap', fontSize: 14, padding: '0 16px' }}>
                      {resendLoading ? '寄送中⋯' : '寄出'}
                    </button>
                  </div>
                  {resendError && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#DC2626' }}>⚠ {resendError}</p>}
                </>
              )}
            </div>
          )}
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
