'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

type DbSession = { id: string; teacher: string; date: string; time: string; cap: number }
type DbTeacher = { key: string; label: string; total_cap: number }
type Reg = { id: string; chinese_name: string; member_id: string | null; student_id: string | null; status: string }
type Interactive = { wanted_sessions: string[]; wanted_ranking: string[]; group_status: string; small_status: string }

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

  // 動態場次與老師（從 /api/interactive/config 載入）
  const [sessions, setSessions] = useState<DbSession[]>([])
  const [teachers, setTeachers] = useState<DbTeacher[]>([])
  const [configLoaded, setConfigLoaded] = useState(false)

  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done] = useState(false)

  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [noSession, setNoSession] = useState(false)
  const [ranking, setRanking] = useState<Record<string, string>>({})
  const [groupAllowOptout, setGroupAllowOptout] = useState(true)  // 集體是否允許不報名
  const [smallRequired, setSmallRequired] = useState(false)       // 分組是否必選

  // 載入場次、老師設定
  useEffect(() => {
    fetch('/api/interactive/config')
      .then(r => r.json())
      .then(d => {
        setSessions(d.sessions || [])
        setTeachers(d.teachers || [])
        setGroupAllowOptout(d.group_allow_optout !== false)
        setSmallRequired(d.small_required === true)
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true))
  }, [])

  // 載入學員資料
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
          setSelectedSessions(ws)
          setNoSession(ws.length === 0)
          const wr: string[] = (d.interactive.wanted_ranking || []).slice(0, 8)
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

  // 截止時間顯示（台北 UTC+8）
  const deadlineTaipei = deadline > 0 ? (() => {
    const taipeiMs = deadline + 8 * 3600 * 1000
    const d = new Date(taipeiMs)
    const month = d.getUTCMonth() + 1
    const day = d.getUTCDate()
    const hour = d.getUTCHours()
    const min = d.getUTCMinutes()
    const monthDay = `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
    const mdSlash = `${month}/${day}`
    const weekday = '日一二三四五六'[d.getUTCDay()]
    const period = hour < 6 ? '凌晨' : hour < 12 ? '早上' : hour === 12 ? '中午' : hour < 18 ? '下午' : '晚上'
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const timeStr = min === 0 ? `${h12}:00` : `${h12}:${String(min).padStart(2, '0')}`
    return { monthDay, mdSlash, weekday, period, timeStr }
  })() : null

  const toggleSession = (sid: string) => {
    setSelectedSessions(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid])
  }
  const toggleNoSession = () => {
    if (!noSession) { setSelectedSessions([]); setNoSession(true) }
    else { setNoSession(false) }
  }

  const toggleRank = (teacherKey: string, n: number) => {
    setRanking(prev => {
      const current = prev[teacherKey]
      if (current === String(n)) {
        const newR: Record<string, string> = {}
        for (const [tid, rank] of Object.entries(prev)) {
          if (parseInt(rank) < n) newR[tid] = rank
        }
        return newR
      }
      const count = Object.values(prev).filter(Boolean).length
      if (!current && n === count + 1) return { ...prev, [teacherKey]: String(n) }
      return prev
    })
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
    if (step === 2 && target > 2) {
      if (groupAllowOptout) {
        if (!noSession && selectedSessions.length === 0) {
          fail('sessions', '若參加集體互動，請至少選擇一個場次（或勾選「不報名參與本次課程的集體互動」）')
          return
        }
      } else if (selectedSessions.length === 0) {
        fail('sessions', '請至少選擇一個集體互動場次')
        return
      }
    }
    if (target <= maxReached) {
      setStep(target); setError(''); setErrorField(null); window.scrollTo({ top: 0, behavior: 'smooth' }); return
    }
    if (target === step + 1) {
      setStep(target)
      setMaxReached(prev => Math.max(prev, target))
      setError('')
      setErrorField(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    setError('')
    setErrorField(null)
    if (pastDeadline) { setError('互動報名已截止'); return }

    const filled = teachers
      .filter(t => ranking[t.key])
      .sort((a, b) => parseInt(ranking[a.key] || '99') - parseInt(ranking[b.key] || '99'))
      .map(t => t.key)

    // 後台規則：集體不可不報名 → 至少一場；分組必選 → 至少一位老師
    if (!groupAllowOptout && selectedSessions.length === 0) {
      setStep(2); fail('sessions', '請至少選擇一個集體互動場次'); return
    }
    if (smallRequired && filled.length === 0) {
      fail('ranking', '請至少為一位老師排序分組互動意願'); return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, wanted_sessions: selectedSessions, wanted_ranking: filled }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '送出失敗')
      router.push(`/member/interactive/success?id=${id}&code=${encodeURIComponent(code)}&dl=${deadline}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !configLoaded) {
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
                  <p>{deadlineTaipei ? `互動報名已開放至 ${deadlineTaipei.mdSlash}（${deadlineTaipei.weekday}）${deadlineTaipei.period} ${deadlineTaipei.timeStr} 截止。` : '互動報名尚未開放，學會將另行寄信通知開放時間，'}請留意您的 Email。如有疑問請聯絡學會。</p>
                </div>
              </div>
            )}

            {open && pastDeadline && (
              <div className="submit-status" style={{ background: 'rgba(184,82,58,0.08)', borderColor: 'rgba(184,82,58,0.3)' }}>
                <div className="submit-status-icon" style={{ background: 'var(--error)' }}>!</div>
                <div className="submit-status-text">
                  <h4>互動報名已截止</h4>
                  <p>互動報名已截止，無法再提交。</p>
                </div>
              </div>
            )}

            {done && !pastDeadline && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>互動報名已送出</h4>
                  <p>送出時間：{new Date().toLocaleString('zh-TW')}</p>
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
                    <p>互動說明：</p>

                    <h3>▎集體互動</h3>
                    <ul>
                      <li>{groupAllowOptout ? '所有學員均可自願報名參加集體互動。' : '本次集體互動為必選，請至少選擇一個場次。'}</li>
                      <li>但集體互動名額有限，最終互動及候補名單將按場次順序，通過隨機抽籤產生。</li>
                    </ul>

                    <h3>▎分組互動</h3>
                    <ul>
                      <li>每位學員皆有一次參與分組互動的機會，請依據自身的互動與學習意願，為三個小組排列優先順序。</li>
                      <li>各組名額有限，優先按學員的第一意願進行分配。若報名人數超出該組名額，則在第一意願申請者中進行抽籤；未能中簽的學員，將依次按其第二意願、第三意願參與抽籤，以此類推。</li>
                    </ul>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 02</p>
                    <h2 className="step-header-title">集體互動</h2>
                    <p className="step-header-desc">請選擇您希望報名的集體互動場次（可多選{groupAllowOptout ? '，非必選' : '，必選'}）</p>
                  </div>
                  <div id="field-sessions" className="session-grid">
                    {groupAllowOptout && (
                      <label className={`session-cell ${noSession ? 'selected' : ''}`} style={{ gridColumn: '1 / -1' }}>
                        <input type="checkbox" checked={noSession} onChange={toggleNoSession} />
                        <div className="session-check" />
                        <div className="session-teacher" style={{ fontWeight: 600 }}>不報名參與本次課程的集體互動</div>
                      </label>
                    )}
                    {(!groupAllowOptout || !noSession) && sessions.map(s => {
                      const checked = selectedSessions.includes(s.id)
                      return (
                        <label key={s.id} className={`session-cell ${checked ? 'selected' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSession(s.id)} />
                          <div className="session-check" />
                          <div className="session-date">{s.date}</div>
                          <div className="session-time">{s.time}</div>
                          <div className="session-teacher">
                            {s.teacher} 互動問答<span className="seats">{s.cap} 人</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <div className="selection-summary">
                    {groupAllowOptout && noSession
                      ? <>已選擇：不報名集體互動</>
                      : selectedSessions.length > 0
                        ? <>已選 <span className="count">{selectedSessions.length}</span> 個場次　·　可繼續勾選多個場次</>
                        : <span style={{ color: 'var(--error)' }}>{groupAllowOptout ? '請至少選一個場次，或勾選「不報名參與本次課程的集體互動」' : '請至少選擇一個集體互動場次（本次集體互動為必選）'}</span>}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 03</p>
                    <h2 className="step-header-title">分組互動</h2>
                    <p className="step-header-desc">請按您的互動及學習意願進行排序（{smallRequired ? '必選' : '可棄權'}）</p>
                  </div>
                  <div className="alert-card">
                    <div className="alert-card-title">填寫說明</div>
                    <p>點選數字按鈕依序設定意願順序（1 = 最希望）；再點同一按鈕可取消，取消後後續順序一併清除。每位老師的數字不可重複，且需連號。{smallRequired ? '本次分組互動為必選，請至少為一位老師排序意願。' : '全空白代表不報名分組互動。'}</p>
                  </div>

                  <div id="field-ranking" style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {teachers.map(t => {
                        const selected = ranking[t.key] || ''
                        const nextRank = Object.values(ranking).filter(Boolean).length + 1
                        return (
                          <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: selected ? 'rgba(73,85,52,0.06)' : 'rgba(255,255,255,0.6)', borderRadius: 10, border: `1px solid ${selected ? 'rgba(73,85,52,0.35)' : 'var(--line)'}` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.label}</div>
                              {/* <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{t.total_cap} 個名額</div> */}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {Array.from({ length: teachers.length }, (_, i) => i + 1).map(n => {
                                const active = selected === String(n)
                                const disabled = selected ? !active : n !== nextRank
                                return (
                                  <button key={n} type="button"
                                    onClick={() => toggleRank(t.key, n)}
                                    disabled={disabled}
                                    style={{
                                      width: 36, height: 36, borderRadius: 8, border: 'none',
                                      cursor: disabled ? 'not-allowed' : 'pointer',
                                      fontFamily: 'var(--font-cormorant), serif', fontWeight: 700, fontSize: 17,
                                      background: active ? 'var(--green-deep)' : 'rgba(0,0,0,0.06)',
                                      color: active ? '#fff' : 'var(--ink-soft)',
                                      transition: 'background 0.15s, color 0.15s, opacity 0.15s',
                                      opacity: disabled ? 0.28 : 1,
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
                      ? (smallRequired
                          ? <span style={{ color: 'var(--error)' }}>請至少為一位老師排序分組互動意願（本次分組互動為必選）</span>
                          : <>尚未選擇　·　<strong style={{ fontSize: '1.05em' }}>不選代表不報名分組互動</strong></>)
                      : <>已選：{teachers.filter(t => ranking[t.key]).map(t => `${t.label} 第${ranking[t.key]}意願`).join('、')}</>}
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
              <div className="deadline-date">{deadlineTaipei ? deadlineTaipei.monthDay : '—'}</div>
              <div className="deadline-text">台北時間{deadlineTaipei ? <>{deadlineTaipei.period} <strong>{deadlineTaipei.timeStr}</strong></> : '—'} 前完成<br />逾期將無法提交</div>
            </div>

            <div className="sidebar-card" style={{ background: 'rgba(216, 194, 154, 0.18)', borderColor: 'rgba(180, 147, 88, 0.3)' }}>
              <h4 style={{ color: 'var(--gold-deep)' }}>※ 貼心提醒 <small>Tips</small></h4>
              <p>{groupAllowOptout
                ? '集體互動請至少選一個場次；若不想參加，請勾選「不報名參與本次課程的集體互動」。'
                : '集體互動為必選，請至少選擇一個場次。'}</p>
              <p style={{ marginTop: 10 }}>{smallRequired
                ? '分組互動為必選，請依 1、2、3… 順序為老師排列意願，不可跳號，至少選擇一位。'
                : '分組互動可棄權；如要報名，請依 1、2、3… 順序為老師排列意願，不可跳號，未填寫代表不報名。'}</p>
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

export default function InteractivePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <InteractiveContent />
    </Suspense>
  )
}
