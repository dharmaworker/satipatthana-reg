'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

const TEACHER_LABEL: Record<string, string> = {
  prasan: '阿姜巴山', nat: '阿姜納', nitiya: '阿姜妮', napatpol: '阿姜松',
}
const SESSION_LABEL: Record<string, string> = {
  s1: '8/21（週五）14:00 — 15:30　阿姜巴山',
  s2: '8/21（週五）14:00 — 15:30　阿姜納',
  s3: '8/22（週六）14:00 — 15:30　阿姜妮',
  s4: '8/22（週六）14:00 — 15:30　阿姜松',
  s5: '8/23（週日）14:00 — 15:30　阿姜巴山',
  s6: '8/23（週日）14:00 — 15:30　阿姜妮',
}

type Reg = { id: string; chinese_name: string; member_id: string | null; student_id: string | null; gender: string | null; identity: string | null; email: string }
type Interactive = { group_status: string; small_status: string; assigned_session: string | null; assigned_group: string | null; assigned_date: string | null }
type Task = {
  learning_duration: string | null; formal_practice: string | null; daily_practice: string | null
  group_prior_interaction: string | null; group_question: string | null
  small_prior_interaction: string | null; small_question: string | null
}

function genderLabel(g: string | null) { return g === 'male' ? '男' : g === 'female' ? '女' : '—' }
function identityLabel(i: string | null) { return i === 'lay' ? '在家居士' : i === 'monastic' ? '出家眾' : '—' }

function TaskContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [reg, setReg] = useState<Reg | null>(null)
  const [interactive, setInteractive] = useState<Interactive | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [notWon, setNotWon] = useState(false)

  // 計算動態 step 列表（依中簽結果決定有沒有集體 / 分組）
  const wonGroup = interactive?.group_status === 'won'
  const wonSmall = interactive?.small_status === 'won'

  const STEPS_DYN: { num: number; label: string }[] = [
    { num: 1, label: '基本資料' },
    ...(wonGroup ? [{ num: 2, label: '集體互動' }] : []),
    ...(wonSmall ? [{ num: wonGroup ? 3 : 2, label: '分組互動' }] : []),
  ]
  const totalSteps = STEPS_DYN.length

  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState<Task>({
    learning_duration: '', formal_practice: '', daily_practice: '',
    group_prior_interaction: '', group_question: '',
    small_prior_interaction: '', small_question: '',
  })

  useEffect(() => {
    if (!id || !code) { setAuthError('需從學員專區進入'); setLoading(false); return }
    fetch(`/api/interactive/task?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) {
          if (d.notWon) setNotWon(true)
          else setAuthError(d.error || '載入失敗')
          return
        }
        setReg(d.registration)
        setInteractive(d.interactive)
        if (d.task) {
          setTask(d.task)
          setForm({
            learning_duration: d.task.learning_duration || '',
            formal_practice: d.task.formal_practice || '',
            daily_practice: d.task.daily_practice || '',
            group_prior_interaction: d.task.group_prior_interaction || '',
            group_question: d.task.group_question || '',
            small_prior_interaction: d.task.small_prior_interaction || '',
            small_question: d.task.small_question || '',
          })
          // 若已填過，預設可瀏覽全部 step
          setMaxReached(99)
        }
      })
      .catch(() => setAuthError('連線失敗'))
      .finally(() => setLoading(false))
  }, [id, code])

  const update = (k: keyof Task, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }))
    if (errorField === k) setErrorField(null)
    if (error) setError('')
  }

  const fail = (field: string, msg: string): false => {
    setError(msg)
    setErrorField(field)
    setTimeout(() => {
      const el = document.getElementById(`field-${field}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return false
  }
  const errCls = (f: string) => errorField === f ? 'error' : ''

  const validateStep1 = () => {
    if (!form.learning_duration?.trim()) return fail('learning_duration', '請填寫 Q5 學習實踐多長時間')
    if (!form.formal_practice?.trim()) return fail('formal_practice', '請填寫 Q6 固定形式練習')
    if (!form.daily_practice?.trim()) return fail('daily_practice', '請填寫 Q7 日常生活練習')
    return true
  }
  const validateGroupStep = () => {
    if (!form.group_prior_interaction) return fail('group_prior_interaction', '請填寫 Q9 是否曾與該老師互動')
    if (!form.group_question?.trim()) return fail('group_question', '請填寫 Q10 集體互動問題')
    return true
  }
  const validateSmallStep = () => {
    if (!form.small_prior_interaction) return fail('small_prior_interaction', '請填寫 Q13 是否曾與該老師互動')
    if (!form.small_question?.trim()) return fail('small_question', '請填寫 Q15 分組互動問題')
    return true
  }

  const validateUpToStep = (n: number): boolean => {
    if (n >= 1 && !validateStep1()) return false
    if (wonGroup && n >= 2 && !validateGroupStep()) return false
    if (wonSmall) {
      const smallStepNum = wonGroup ? 3 : 2
      if (n >= smallStepNum && !validateSmallStep()) return false
    }
    return true
  }

  const goToStep = (target: number) => {
    if (target === step) return
    if (target < step) { setStep(target); setErrorField(null); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    // forward: validate current
    if (step === 1 && !validateStep1()) return
    if (step === 2 && wonGroup && !validateGroupStep()) return
    setStep(target)
    setMaxReached(prev => Math.max(prev, target))
    setError('')
    setErrorField(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setError('')
    setErrorField(null)
    if (!validateUpToStep(totalSteps)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/interactive/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, ...form }),
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

  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>
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
  if (notWon) {
    return (
      <main className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-icon">⏳</div>
          <h1 className="login-title">本頁僅限互動中簽者</h1>
          <p className="login-subtitle">您目前的互動報名結果尚未中簽，互動作業僅限中簽者填寫。<br />如有疑問請聯絡學會。</p>
          <a href={`/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`} className="btn btn-primary btn-block">返回學員專區</a>
        </div>
      </main>
    )
  }

  const stepperPct = totalSteps === 1 ? 100 : ((step - 1) / (totalSteps - 1)) * 100
  const dashboardHref = `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`
  const initial = reg?.chinese_name?.charAt(0) || '?'

  // 計算實際的 step number（內部記）
  const groupStepNum = 2
  const smallStepNum = wonGroup ? 3 : 2

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
          <p className="page-kicker">Interactive Task</p>
          <h1 className="page-title">互動作業</h1>
          <p className="page-subtitle">請填寫您近期的實修狀況，老師會依此準備指導。<br />每題互動問題限 75 字內。</p>

          {totalSteps > 1 && (
            <div className="stepper">
              <div className="stepper-track">
                <div className="stepper-line" />
                <div className="stepper-line-active" style={{ width: `${stepperPct}%` }} />
                {STEPS_DYN.map(s => {
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
          )}
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
                    {wonGroup && <span className="status-badge accepted" style={{ fontSize: 11, padding: '2px 8px' }}><span className="dot" />集體中簽</span>}
                    {wonSmall && <span className="status-badge accepted" style={{ fontSize: 11, padding: '2px 8px' }}><span className="dot" />分組中簽</span>}
                  </div>
                </div>
              </div>
            )}

            {done && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>互動作業已送出</h4>
                  <p>送出時間：{new Date().toLocaleString('zh-TW')}　·　如需修改請於課程開始前重新送出。</p>
                </div>
              </div>
            )}
            {!done && task && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>已送出（可繼續修改）</h4>
                  <p>系統已收到您的互動作業。如有調整請修改後再次送出。</p>
                </div>
              </div>
            )}

            <div className="form-card">
              {step === 1 && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 01 · Personal Background</p>
                    <h2 className="step-header-title">基本資料</h2>
                    <p className="step-header-desc">您的身份資料由系統自動帶入。請填寫實修背景。</p>
                  </div>

                  <div className="field-row">
                    <ReadonlyField num="01." label="報名序號" value={reg?.member_id || '—'} />
                    <ReadonlyField num="01b." label="學號" value={reg?.student_id || '—'} />
                    <ReadonlyField num="02." label="中文姓名" value={reg?.chinese_name || ''} />
                  </div>
                  <div className="field-row" style={{ marginTop: 12 }}>
                    <ReadonlyField num="03." label="性別" value={genderLabel(reg?.gender || null)} />
                    <ReadonlyField num="04." label="身份" value={identityLabel(reg?.identity || null)} />
                  </div>

                  <div style={{ marginTop: 16 }} id="field-learning_duration">
                    <label className="form-label">05. 您學習並實踐隆波帕默尊者的教導多長時間了？ <span className="required">*</span></label>
                    <input className={`form-input ${errCls('learning_duration')}`} placeholder="例：3 年、半年、剛開始等"
                      value={form.learning_duration || ''}
                      onChange={e => update('learning_duration', e.target.value)} />
                  </div>

                  <div style={{ marginTop: 14 }} id="field-formal_practice">
                    <label className="form-label">06. 請填寫您固定形式的練習方法、頻率和時長 <span className="required">*</span></label>
                    <p className="form-hint">如果是念誦請註明內容；如同時採用兩種以上練習也請註明（例如：每日經行 1 小時 + 念誦半小時）</p>
                    <textarea className={`form-textarea ${errCls('formal_practice')}`} rows={4}
                      placeholder="例：每日經行三小時、靜坐一小時，每週至少 5 天"
                      value={form.formal_practice || ''}
                      onChange={e => update('formal_practice', e.target.value)} />
                  </div>

                  <div style={{ marginTop: 14 }} id="field-daily_practice">
                    <label className="form-label">07. 請填寫您在日常生活中的練習方法 <span className="required">*</span></label>
                    <p className="form-hint">例如：觀身體的動停、念誦（請註明念誦的內容）等</p>
                    <textarea className={`form-textarea ${errCls('daily_practice')}`} rows={4}
                      placeholder="例：在通勤、用餐、工作中保持覺察身體的動作"
                      value={form.daily_practice || ''}
                      onChange={e => update('daily_practice', e.target.value)} />
                  </div>
                </div>
              )}

              {step === groupStepNum && wonGroup && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 0{groupStepNum} · Group Interactive</p>
                    <h2 className="step-header-title">集體互動作業</h2>
                    <p className="step-header-desc">請就您中簽的集體場次填寫問題。</p>
                  </div>

                  <ReadonlyField num="08." label="您中簽的集體互動場次"
                    value={interactive?.assigned_session ? SESSION_LABEL[interactive.assigned_session] || interactive.assigned_session : '（待學會指定）'} />

                  <div style={{ marginTop: 16 }} id="field-group_prior_interaction">
                    <label className="form-label">09. 您是否曾與這位指導老師互動過？ <span className="required">*</span></label>
                    <div className={`opt-group inline ${errCls('group_prior_interaction')}`}>
                      {[['yes', '是'], ['no', '否']].map(([v, l]) => {
                        const checked = form.group_prior_interaction === v
                        return (
                          <label key={v} className={`opt ${checked ? 'selected' : ''}`}>
                            <input type="radio" name="group_prior" value={v} checked={checked}
                              onChange={() => update('group_prior_interaction', v)} />
                            <span className="opt-text">{l}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }} id="field-group_question">
                    <label className="form-label">10. 請填寫您近期的實修情況以及希望這位老師指導的實修中出現的問題 <span className="required">*</span></label>
                    <p className="form-hint">
                      <strong style={{ color: 'var(--gold-deep)' }}>限 75 字內</strong>。互動是由老師針對您當前實修狀態給予指導的機會。
                      請不要提交：①和實修無關的內容；②已過去很久的境界；③純理論。
                    </p>
                    <textarea className={`form-textarea ${errCls('group_question')}`} rows={4} maxLength={75}
                      placeholder="例：最近固定模式經常昏昏沉沉，覺性也慢，心重苦比較多，心力弱。請老師指點突破。"
                      value={form.group_question || ''}
                      onChange={e => update('group_question', e.target.value)} />
                    <p className="form-hint" style={{ textAlign: 'right' }}>{(form.group_question || '').length} / 75</p>
                  </div>
                </div>
              )}

              {step === smallStepNum && wonSmall && (
                <div className="step-content active">
                  <div className="step-header">
                    <p className="step-header-kicker">Step 0{smallStepNum} · Small Group Interactive</p>
                    <h2 className="step-header-title">分組互動作業</h2>
                    <p className="step-header-desc">請就您中簽的分組填寫問題。</p>
                  </div>

                  <div className="field-row">
                    <ReadonlyField num="12." label="您中簽的分組"
                      value={interactive?.assigned_group ? `${TEACHER_LABEL[interactive.assigned_group] || interactive.assigned_group} 組` : '（待學會指定）'} />
                    <ReadonlyField num="14." label="互動日期"
                      value={interactive?.assigned_date || '（待學會指定）'} />
                  </div>

                  <div style={{ marginTop: 16 }} id="field-small_prior_interaction">
                    <label className="form-label">13. 您是否曾與這位指導老師互動過？ <span className="required">*</span></label>
                    <div className={`opt-group inline ${errCls('small_prior_interaction')}`}>
                      {[['yes', '是'], ['no', '否']].map(([v, l]) => {
                        const checked = form.small_prior_interaction === v
                        return (
                          <label key={v} className={`opt ${checked ? 'selected' : ''}`}>
                            <input type="radio" name="small_prior" value={v} checked={checked}
                              onChange={() => update('small_prior_interaction', v)} />
                            <span className="opt-text">{l}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }} id="field-small_question">
                    <label className="form-label">15. 請填寫您近期的實修情況以及希望這位老師指導的實修中出現的問題 <span className="required">*</span></label>
                    <p className="form-hint">
                      <strong style={{ color: 'var(--gold-deep)' }}>限 75 字內</strong>。同上互動規範。
                    </p>
                    <textarea className={`form-textarea ${errCls('small_question')}`} rows={4} maxLength={75}
                      placeholder="例：最近固定模式經常昏昏沉沉，覺性也慢，心重苦比較多，心力弱。請老師指點突破。"
                      value={form.small_question || ''}
                      onChange={e => update('small_question', e.target.value)} />
                    <p className="form-hint" style={{ textAlign: 'right' }}>{(form.small_question || '').length} / 75</p>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <ReadonlyField num="16." label="聯絡電子信箱（送出後內容會寄送至此）" value={reg?.email || ''} />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="alert-card" style={{ marginTop: 18 }}>
                <div className="alert-card-title">{error}</div>
              </div>
            )}

            <div className="form-actions">
              {step > 1
                ? <button onClick={() => goToStep(step - 1)} className="btn btn-ghost">← 上一步</button>
                : <a href={dashboardHref} className="btn btn-ghost">← 返回學員專區</a>}
              {step < totalSteps
                ? <button onClick={() => goToStep(step + 1)} className="btn btn-primary">下一步 <span className="arrow">→</span></button>
                : <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
                    {submitting ? '送出中⋯' : task ? '送出修改' : '確認送出'} <span className="arrow">→</span>
                  </button>}
            </div>
          </div>

          <aside>
            <div className="sidebar-card" style={{ background: 'rgba(216, 194, 154, 0.18)', borderColor: 'rgba(180, 147, 88, 0.3)' }}>
              <h4 style={{ color: 'var(--gold-deep)' }}>※ 貼心提醒 <small>Tips</small></h4>
              <p>互動問題限 <strong>75 字內</strong>，請聚焦於當前實修狀態與具體疑問。</p>
              <p style={{ marginTop: 10 }}>避免：①與實修無關的內容；②過去很久的境界；③純理論。</p>
              <p style={{ marginTop: 10 }}>送出後可繼續修改，老師會於課前準備指導。</p>
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

function ReadonlyField({ num, label, value }: { num: string; label: string; value: string }) {
  return (
    <div>
      <label className="form-label">{num} {label}</label>
      <div style={{
        padding: '11px 16px',
        background: 'var(--bg-deep)',
        border: '1.5px solid var(--line)',
        borderRadius: 14,
        color: 'var(--ink)',
        fontWeight: 500,
        fontSize: 14.5,
        cursor: 'not-allowed',
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function TaskPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <TaskContent />
    </Suspense>
  )
}
