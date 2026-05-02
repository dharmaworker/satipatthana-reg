'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

type SessionId = string
type TeacherId = string
type Reg = { id: string; chinese_name: string; member_id: string | null; student_id: string | null; status: string }
type Interactive = { wanted_sessions: SessionId[]; wanted_ranking: TeacherId[]; group_status: string; small_status: string }

const TEACHERS: { id: TeacherId; name: string; nameEn: string; seats: number }[] = [
  { id: 'prasan',   name: '阿姜巴山', nameEn: 'Ajahn Prasan',   seats: 38 },
  { id: 'nat',      name: '阿姜納',   nameEn: 'Ajahn Nat',      seats: 38 },
  { id: 'nitiya',   name: '阿姜妮',   nameEn: 'Ajahn Nitiya',   seats: 38 },
  { id: 'napatpol', name: '阿姜松',   nameEn: 'Ajahn Napatpol', seats: 38 },
]

const SESSIONS = [
  { id: 's1', date: '8月20日（四）', time: '14:30 — 15:30', teacher: '阿姜宋猜尊者', seats: 5 },
  { id: 's2', date: '8月21日（五）', time: '14:00 — 15:30', teacher: '麥琪奧蘭努',   seats: 8 },
  { id: 's3', date: '8月24日（一）', time: '14:00 — 15:30', teacher: '阿姜給尊者',   seats: 5 },
]

const STEPS = [
  { num: 1, label: '規則說明' },
  { num: 2, label: '集體互動' },
  { num: 3, label: '分組互動' },
]

function InteractiveContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [reg, setReg] = useState<Reg | null>(null)
  const [interactive, setInteractive] = useState<Interactive | null>(null)
  const [deadline, setDeadline] = useState<number>(0)
  const [open, setOpen] = useState(true)
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done] = useState(false)

  const [sessions, setSessions] = useState<SessionId[]>([])
  const [noSession, setNoSession] = useState(false)
  const [ranking, setRanking] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id || !code) { setAuthError('需從學員專區進入'); setLoading(false); return }
    fetch(`/api/interactive?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) { setAuthError(d.error || '載入失敗'); return }
        setReg(d.registration)
        setDeadline(d.deadline)
        setOpen(d.open !== false)
        setPreview(!!d.preview)
        if (d.interactive) {
          setInteractive(d.interactive)
          const ws = d.interactive.wanted_sessions || []
          setSessions(ws)
          setNoSession(ws.length === 0)
          const wr: string[] = (d.interactive.wanted_ranking || []).slice(0, 4)
          const r: Record<string, string> = {}
          wr.forEach((tid: string, idx: number) => { if (!r[tid]) r[tid] = String(idx + 1) })
          setRanking(r)
          setMaxReached(STEPS.length)
        }
      })
      .catch(() => setAuthError('連線失敗'))
      .finally(() => setLoading(false))
  }, [id, code])

  const pastDeadline = deadline > 0 && Date.now() > deadline
  const initial = reg?.chinese_name?.charAt(0) || '?'

  const toggleSession = (sid: SessionId) => {
    setSessions(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid])
  }
  const toggleNoSession = () => {
    if (!noSession) {
      setSessions([])
      setNoSession(true)
    } else {
      setNoSession(false)
    }
  }

  const fail = (field: string, msg: string) => {
    setError(msg)
    setErrorField(field)
    setTimeout(() => {
      const el = document.getElementById(`field-${field}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  const goToStep = (target: number) => {
    if (target === step) return
    if (target < step) { setStep(target); setErrorField(null); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (target <= maxReached) {
      setStep(target); setErrorField(null); window.scrollTo({ top: 0, behavior: 'smooth' }); return
    }
    if (target === step + 1) {
      setStep(target)
      setMaxReached(prev => Math.max(prev, target))
      setErrorField(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    setError('')
    setErrorField(null)
    if (!open) { setError('互動報名尚未開放'); return }
    if (pastDeadline) { setError('互動報名已截止'); return }

    const filled = TEACHERS
      .filter(t => ranking[t.id])
      .sort((a, b) => parseInt(ranking[a.id] || '99') - parseInt(ranking[b.id] || '99'))
      .map(t => t.id)

    setSubmitting(true)
    try {
      const res = await fetch('/api/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, wanted_sessions: sessions, wanted_ranking: filled }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '送出失敗')
      router.push(`/member/interactive/success?id=${id}&code=${encodeURIComponent(code)}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>
  }
  if (authError) {
    return (
      <main className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-icon" style={{ background: 'linear-gradient(135deg,#cf8f6c,#8b4f32)' }}>!</div>
          <h1 className="login-title">無法存取</h1>
          <p className="login-subtitle">{authError}</p>
          <a href="/member" className="btn btn-primary btn-block">前往學員專區</a>
        </div>
      </main>
    )
  }

  const stepperPct = ((step - 1) / (STEPS.length - 1)) * 100
  const dashboardHref = `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" /><div className="page-blob b2" /><div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href={dashboardHref} className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel"><small>Member Portal</small><span>學員專區</span></span>
          </a>
          <div className="nav-actions">
            <a href={dashboardHref} className="nav-back">← 學員首頁</a>
          </div>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Interactive Registration</p>
          <h1 className="page-title">互動報名</h1>
          <p className="page-subtitle">登記您希望參加的集體互動場次與分組互動的優先順序。<br />送出後可於截止前重新送出修改。</p>

          <div className="stepper">
            <div className="stepper-track">
              <div className="stepper-line" />
              <div className="stepper-line-active" style={{ width: `${stepperPct}%` }} />
              {STEPS.map(s => {
                const status = s.num < step ? 'done' : s.num === step ? 'active' : ''
                const clickable = s.num <= maxReached
                return (
                  <div key={s.num} className={`step ${status} ${clickable ? 'clickable' : ''}`}
                    onClick={() => clickable && goToStep(s.num)}>
                    <div className="step-num"><span className="n">{s.num}</span></div>
                    <div className="step-label"><small>STEP 0{s.num}</small>{s.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="container">
        <div className="layout">
          <div>
            {reg && (
              <div className="member-card">
                <div className="avatar">{initial}</div>
                <div className="info">
                  <div className="name">{reg.chinese_name} 法友</div>
                  <div className="meta">
                    <span><strong>報名序號</strong>{reg.member_id || '—'}</span>
                    <span><strong>學號</strong>{reg.student_id || '—'}</span>
                    <span className="status-badge accepted" style={{ fontSize: 11, padding: '2px 8px' }}>
                      <span className="dot" />已錄取
                    </span>
                  </div>
                </div>
              </div>
            )}

            {preview && (
              <div className="submit-status" style={{ background: 'rgba(73, 85, 52, 0.08)', borderColor: 'rgba(73, 85, 52, 0.35)' }}>
                <div className="submit-status-icon" style={{ background: 'var(--green-deep)' }}>🔧</div>
                <div className="submit-status-text">
                  <h4>後台預覽模式</h4>
                  <p>此頁尚未對學員開放，您（admin）以預覽身分操作，<strong>送出的內容會真實寫入此學員的互動報名</strong>。請使用測試學員，並於開放前清理測試資料。</p>
                </div>
              </div>
            )}

            {!open && !preview && (
              <div className="submit-status" style={{ background: 'rgba(216, 194, 154, 0.18)', borderColor: 'rgba(180, 147, 88, 0.3)' }}>
                <div className="submit-status-icon" style={{ background: 'var(--gold-deep)' }}>⏳</div>
                <div className="submit-status-text">
                  <h4>互動報名尚未開放</h4>
                  <p>互動報名尚未開放，學會將另行寄信通知開放時間，請留意您的 Email。如有疑問請聯絡學會。</p>
                </div>
              </div>
            )}

            {open && pastDeadline && (
              <div className="submit-status" style={{ background: 'rgba(184,82,58,0.08)', borderColor: 'rgba(184,82,58,0.3)' }}>
                <div className="submit-status-icon" style={{ background: 'var(--error)' }}>!</div>
                <div className="submit-status-text">
                  <h4>互動報名已截止</h4>
                  <p>互動報名已於 7/15 晚上 8 點（台北時間）截止，無法再提交。</p>
                </div>
              </div>
            )}

            {done && !pastDeadline && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>互動報名已送出</h4>
                  <p>送出時間：{new Date().toLocaleString('zh-TW')}　·　如需修改請於 7/15 截止前重新送出</p>
                </div>
              </div>
            )}
            {!done && interactive && !pastDeadline && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>已送出（可繼續修改）</h4>
                  <p>系統已收到您的互動報名。如有調整請修改後再次送出。</p>
                </div>
              </div>
            )}

            <fieldset disabled={pastDeadline || !open} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div className="form-card">

              {step === 1 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 01</p>
                    <h2 className="step-header-title">規則說明</h2>
                    <p className="step-header-desc">請仔細閱讀互動規則，確認後進入下一步。</p>
                  </div>
                  <div className="rules-intro">
                    <p>本次活動期間的互動分為集體互動與小組互動。每位學員皆可報名集體互動和小組互動。</p>

                    <h3>1. 集體互動說明</h3>
                    <ul>
                      <li>集體互動名額有限，並非每位學員都有集體互動的機會。</li>
                      <li>將根據在報名期間內實際接收到的有效報名表，按照課表中「互動場次」的順序，按場次順序進行「抽籤」，最終生成集體互動名單及順序、候補名單及順序。</li>
                      <li>學員可自願報名多個集體互動場次，但最多只能享有 1 次互動機會。在您報名的多場互動的順場次抽籤中，若其中一場您被抽中，則餘下場次您將不會再參與抽籤。</li>
                    </ul>

                    <h3>2. 分組互動說明</h3>
                    <p>每位學員有且僅有一次分組互動的機會。</p>
                    <ul>
                      <li>所有學員依照自己分組互動意願的優先順序進行排序。</li>
                      <li>依學員的互動意願排序次第進行隨機抽籤。</li>
                      <li>若某一位指導老師的第一意願互動報名人數超出既定的互動名額，則啟動抽籤程序；若某一位指導老師的第一意願互動報名人數少於或等於既定的互動名額，則該第一意願報名人員均為互動人員，以此產生互動名單並抽籤依此類推，直至所有互動名額分配完畢。</li>
                      <li>每位學員最多享有 1 次分組互動機會，如果您被其中一場抽中，則您報名的其他指導老師或其餘場次自動失效，以前抽中的場次為準。</li>
                    </ul>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 02</p>
                    <h2 className="step-header-title">集體互動</h2>
                    <p className="step-header-desc">請選擇您希望報名互動的場次（可多選）。最終以隨機抽籤產生名單。</p>
                  </div>
                  <div className="session-grid">
                    <label className={`session-cell ${noSession ? 'selected' : ''}`} style={{ gridColumn: '1 / -1' }}>
                      <input type="checkbox" checked={noSession} onChange={toggleNoSession} />
                      <div className="session-check" />
                      <div className="session-teacher" style={{ fontWeight: 600 }}>不報名參與本次課程的集體互動</div>
                    </label>
                    {!noSession && SESSIONS.map(s => {
                      const checked = sessions.includes(s.id)
                      return (
                        <label key={s.id} className={`session-cell ${checked ? 'selected' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSession(s.id)} />
                          <div className="session-check" />
                          <div className="session-date">2026年{s.date}</div>
                          <div className="session-time">{s.time}</div>
                          <div className="session-teacher">
                            {s.teacher} 互動問答<span className="seats">{s.seats} 人</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <div className="selection-summary">
                    {noSession
                      ? <>已選擇：不報名集體互動</>
                      : <>已選 <span className="count">{sessions.length}</span> 個場次　·　可繼續勾選或保持空白</>}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 03</p>
                    <h2 className="step-header-title">分組互動</h2>
                    <p className="step-header-desc">點選每位老師的意願順序（1 = 最希望）。同一數字可給多位老師，不點選代表棄權。</p>
                  </div>
                  <div className="alert-card">
                    <div className="alert-card-title">填寫說明</div>
                    <p>點選數字按鈕設定意願順序；再點同一按鈕可取消。同一數字可同時給多位老師（代表同等意願）。全部不選代表不報名分組互動。</p>
                  </div>

                  <div id="field-ranking" style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {TEACHERS.map(t => {
                        const selected = ranking[t.id] || ''
                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: selected ? 'rgba(73,85,52,0.06)' : 'rgba(255,255,255,0.6)', borderRadius: 10, border: `1px solid ${selected ? 'rgba(73,85,52,0.35)' : 'var(--line)'}` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{t.seats} 個名額</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {[1, 2, 3, 4].map(n => {
                                const active = selected === String(n)
                                return (
                                  <button key={n} type="button"
                                    onClick={() => setRanking(prev => ({ ...prev, [t.id]: active ? '' : String(n) }))}
                                    style={{
                                      width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                                      fontFamily: 'var(--font-cormorant), serif', fontWeight: 700, fontSize: 17,
                                      background: active ? 'var(--green-deep)' : 'rgba(0,0,0,0.06)',
                                      color: active ? '#fff' : 'var(--ink-soft)',
                                      transition: 'background 0.15s, color 0.15s',
                                    }}>
                                    {n}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {Object.values(ranking).some(v => v) && (
                      <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <button type="button" onClick={() => setRanking({})}
                          style={{ fontSize: 13, color: 'var(--ink-mute)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                          清除全部
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="selection-summary" style={{ marginTop: 16 }}>
                    {Object.values(ranking).every(v => !v)
                      ? <>尚未選擇　·　不選代表不報名分組互動</>
                      : <>已選：{TEACHERS.filter(t => ranking[t.id]).map(t => `${t.name} 第${ranking[t.id]}意願`).join('、')}</>}
                  </div>
                </div>
              )}

            </div>
            </fieldset>

            {error && (
              <div className="alert-card" style={{ marginTop: 18 }}>
                <div className="alert-card-title">{error}</div>
              </div>
            )}

            <div className="form-actions">
              {step > 1
                ? <button onClick={() => goToStep(step - 1)} className="btn btn-ghost">← 上一步</button>
                : <a href={dashboardHref} className="btn btn-ghost">← 返回學員專區</a>}
              {step < STEPS.length
                ? <button onClick={() => goToStep(step + 1)} disabled={pastDeadline || !open} className="btn btn-primary">下一步 <span className="arrow">→</span></button>
                : <button onClick={handleSubmit} disabled={submitting || pastDeadline || !open} className="btn btn-primary">
                    {submitting ? '送出中⋯' : interactive ? '送出修改' : '送出互動報名'} <span className="arrow">→</span>
                  </button>}
            </div>
          </div>

          <aside>
            <div className="deadline-card">
              <div className="deadline-label">Deadline</div>
              <div className="deadline-date">07.15</div>
              <div className="deadline-text">台北時間晚上 <strong>8:00</strong> 前完成<br />逾期將無法提交</div>
            </div>

            <div className="sidebar-card" style={{ background: 'rgba(216, 194, 154, 0.18)', borderColor: 'rgba(180, 147, 88, 0.3)' }}>
              <h4 style={{ color: 'var(--gold-deep)' }}>※ 貼心提醒 <small>Tips</small></h4>
              <p>集體互動可全部不勾，代表不報名集體互動。</p>
              <p style={{ marginTop: 10 }}>分組互動可棄權、可重複選、可只選一個，未填寫請保持空白。</p>
              <p style={{ marginTop: 10 }}>抽籤結果由學會於互動報名截止後寄信通知。</p>
            </div>

            <div className="sidebar-card">
              <h4>需要協助 <small>Help</small></h4>
              <p>聯絡學會：<br /><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></p>
              <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, display: 'block', marginTop: 10 }} />
              <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 6, marginBottom: 0 }}>請加入學會LINE官方帳號洽詢</p>
            </div>
          </aside>
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

export default function InteractivePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <InteractiveContent />
    </Suspense>
  )
}
