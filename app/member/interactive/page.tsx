'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type SessionId = string
type TeacherId = string
type Reg = { id: string; chinese_name: string; member_id: string | null; status: string }
type Interactive = { wanted_sessions: SessionId[]; wanted_ranking: TeacherId[]; group_status: string; small_status: string }

const TEACHERS: { id: TeacherId; name: string; nameEn: string }[] = [
  { id: 'nat',      name: '阿姜納',   nameEn: 'Ajahn Nat' },
  { id: 'prasan',   name: '阿姜巴山', nameEn: 'Ajahn Prasan' },
  { id: 'nitiya',   name: '阿姜妮',   nameEn: 'Ajahn Nitiya' },
  { id: 'napatpol', name: '阿姜松',   nameEn: 'Ajahn Napatpol' },
]
const TEACHER_LABEL: Record<string, string> = Object.fromEntries(TEACHERS.map(t => [t.id, t.name]))

const SESSIONS = [
  { id: 's2', date: '8/21', weekday: '週五', time: '14:00 — 15:30', teacher: 'nat',      seats: 8 },
  { id: 's1', date: '8/21', weekday: '週五', time: '14:00 — 15:30', teacher: 'prasan',   seats: 8 },
  { id: 's3', date: '8/22', weekday: '週六', time: '14:00 — 15:30', teacher: 'nitiya',   seats: 8 },
  { id: 's4', date: '8/22', weekday: '週六', time: '14:00 — 15:30', teacher: 'napatpol', seats: 8 },
  { id: 's6', date: '8/23', weekday: '週日', time: '14:00 — 15:30', teacher: 'nitiya',   seats: 8 },
  { id: 's5', date: '8/23', weekday: '週日', time: '14:00 — 15:30', teacher: 'prasan',   seats: 8 },
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
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [sessions, setSessions] = useState<SessionId[]>([])
  const [ranking, setRanking] = useState<(TeacherId | null)[]>([null, null, null, null])

  useEffect(() => {
    if (!id || !code) { setAuthError('需從學員專區進入'); setLoading(false); return }
    fetch(`/api/interactive?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) { setAuthError(d.error || '載入失敗'); return }
        setReg(d.registration)
        setDeadline(d.deadline)
        if (d.interactive) {
          setInteractive(d.interactive)
          setSessions(d.interactive.wanted_sessions || [])
          const r4: (TeacherId | null)[] = [null, null, null, null]
          ;(d.interactive.wanted_ranking || []).slice(0, 4).forEach((t: any, i: number) => { r4[i] = t })
          setRanking(r4)
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
  const addToNextSlot = (tid: TeacherId) => {
    if (ranking.includes(tid)) return
    const idx = ranking.findIndex(r => r === null)
    if (idx === -1) return
    const next = [...ranking]
    next[idx] = tid
    setRanking(next)
  }
  const removeFromSlot = (priority: number) => {
    const next = [...ranking]
    next[priority - 1] = null
    setRanking(next)
  }

  const goToStep = (target: number) => {
    if (target === step) return
    if (target < step) { setStep(target); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (target <= maxReached) {
      setStep(target); window.scrollTo({ top: 0, behavior: 'smooth' }); return
    }
    if (target === step + 1) {
      setStep(target)
      setMaxReached(prev => Math.max(prev, target))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (pastDeadline) { setError('互動報名已截止'); return }

    const filled = ranking.filter(Boolean) as TeacherId[]
    if (filled.length > 0 && filled.length !== 4) {
      setError('分組互動需要排序 4 位老師完整')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, wanted_sessions: sessions, wanted_ranking: filled }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '送出失敗')
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
                    <span><strong>報名序號</strong>{reg.member_id || '待編號'}</span>
                    <span className="status-badge accepted" style={{ fontSize: 11, padding: '2px 8px' }}>
                      <span className="dot" />已錄取
                    </span>
                  </div>
                </div>
              </div>
            )}

            {pastDeadline && (
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

            <fieldset disabled={pastDeadline} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div className="form-card">

              {step === 1 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 01</p>
                    <h2 className="step-header-title">規則說明</h2>
                    <p className="step-header-desc">請仔細閱讀互動規則，確認後進入下一步。</p>
                  </div>
                  <div className="rules-intro">
                    <h3>集體互動</h3>
                    <ul>
                      <li>所有學員均可<strong>自願報名</strong>參加集體互動</li>
                      <li>集體互動名額有限，最終互動及候補名單將按場次順序，<strong>通過隨機抽籤產生</strong></li>
                    </ul>
                    <h3>分組互動</h3>
                    <ul>
                      <li>請所有學員根據自身的互動與學習意願，對<strong>四個小組</strong>進行優先級排序</li>
                      <li>各組名額有限，優先按學員的第一意願進行分配</li>
                      <li>若報名人數超出該組名額，則在第一意願申請者中進行抽籤；未能中籤的學員，將依次按其第二、第三意願參與抽籤</li>
                    </ul>
                    <h3>互動名額</h3>
                    <ul>
                      <li>所有學員可同時報名集體互動與分組互動</li>
                      <li>每位學員均有<strong>一次分組互動</strong>的機會；集體互動名額則通過抽籤決定</li>
                    </ul>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 02</p>
                    <h2 className="step-header-title">集體互動</h2>
                    <p className="step-header-desc">請選擇您希望報名的場次（可複選或保持空白）。最終以隨機抽籤產生名單。</p>
                  </div>
                  <div className="session-grid">
                    {SESSIONS.map(s => {
                      const checked = sessions.includes(s.id)
                      return (
                        <label key={s.id} className={`session-cell ${checked ? 'selected' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSession(s.id)} />
                          <div className="session-check" />
                          <div className="session-date">{s.date}（{s.weekday}）</div>
                          <div className="session-time">{s.time}</div>
                          <div className="session-teacher">
                            {TEACHER_LABEL[s.teacher]}<span className="seats">{s.seats} 人</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <div className="selection-summary">
                    已選 <span className="count">{sessions.length}</span> 個場次　·　可繼續勾選或保持空白
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 03</p>
                    <h2 className="step-header-title">分組互動</h2>
                    <p className="step-header-desc">將右側老師加入左側順位欄。順位 1 = 第一意願，順位 4 = 第四意願。可全部不填代表不參加分組互動。</p>
                  </div>
                  <div className="alert-card">
                    <div className="alert-card-title">填寫說明</div>
                    <p>點擊右側老師加入下一個空欄；已填入的老師可點 <strong style={{ color: 'var(--error)' }}>✕</strong> 移回右側。要報名分組互動請排滿 4 位（必須完整排序），不報名則保持空白。</p>
                  </div>

                  <div className="ranking-board">
                    <div>
                      <div className="board-title">您的意願順序 <small>Your Priority</small></div>
                      <div className="slot-list">
                        {[1, 2, 3, 4].map(p => {
                          const tid = ranking[p - 1]
                          const teacher = tid ? TEACHERS.find(t => t.id === tid) : null
                          return (
                            <div key={p} className={`slot ${tid ? 'filled' : ''}`} data-priority={p}>
                              <div className="slot-num">{p}</div>
                              <div className="slot-content">
                                {teacher ? (
                                  <>{teacher.name}<small>{teacher.nameEn}</small></>
                                ) : (
                                  <>第{['一', '二', '三', '四'][p - 1]}意願（點擊老師加入）</>
                                )}
                              </div>
                              <button type="button" className="slot-remove"
                                onClick={() => removeFromSlot(p)} aria-label="移除">✕</button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="board-title">分組老師 <small>Available</small></div>
                      <div className="pool-list">
                        {TEACHERS.map(t => {
                          const used = ranking.includes(t.id)
                          return (
                            <button key={t.id} type="button"
                              className={`pool-item ${used ? 'used' : ''}`}
                              disabled={used}
                              onClick={() => addToNextSlot(t.id)}>
                              <div className="pool-name">{t.name}<small>{t.nameEn}</small></div>
                              <span className="pool-add">{used ? '已加入' : '加入'}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="selection-summary">
                    {ranking.every(r => r === null)
                      ? <>尚未排序　·　不填代表不報名分組互動</>
                      : <>目前順序：{ranking.map((r, i) => r ? `${i + 1}. ${TEACHER_LABEL[r]}` : null).filter(Boolean).join('　')}</>}
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
                ? <button onClick={() => goToStep(step + 1)} disabled={pastDeadline} className="btn btn-primary">下一步 <span className="arrow">→</span></button>
                : <button onClick={handleSubmit} disabled={submitting || pastDeadline} className="btn btn-primary">
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
              <p style={{ marginTop: 10 }}>分組互動要排序就要排<strong>完整 4 位</strong>，不報則保持空白。</p>
              <p style={{ marginTop: 10 }}>抽籤結果由學會於互動報名截止後寄信通知。</p>
            </div>

            <div className="sidebar-card">
              <h4>需要協助 <small>Help</small></h4>
              <p>聯絡學會：<br /><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></p>
            </div>
          </aside>
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

export default function InteractivePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <InteractiveContent />
    </Suspense>
  )
}
