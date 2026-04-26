'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type PlanRow = { id: string; label: string; date: string; amount: number; method: 'transfer' | 'card'; test?: boolean }
const PLANS: PlanRow[] = [
  { id: 'A1', label: 'A 方案', date: '8/20 — 8/24 食宿等費用', amount: 18600, method: 'transfer' },
  { id: 'A2', label: 'A 方案', date: '8/20 — 8/24 食宿等費用', amount: 19300, method: 'card' },
  { id: 'B1', label: 'B 方案', date: '8/19 — 8/24 食宿費用', amount: 20350, method: 'transfer' },
  { id: 'B2', label: 'B 方案', date: '8/19 — 8/24 食宿費用', amount: 21050, method: 'card' },
  { id: 'C1', label: 'C 方案', date: '8/19 — 8/25 食宿等費用', amount: 22590, method: 'transfer' },
  { id: 'C2', label: 'C 方案', date: '8/19 — 8/25 食宿等費用', amount: 23290, method: 'card' },
  { id: 'D1', label: 'D 方案', date: '8/20 — 8/25 食宿等費用', amount: 20840, method: 'transfer' },
  { id: 'D2', label: 'D 方案', date: '8/20 — 8/25 食宿等費用', amount: 21540, method: 'card' },
  { id: 'T1', label: '【測試】匯款', date: '測試專用', amount: 1, method: 'transfer', test: true },
  { id: 'T2', label: '【測試】刷卡', date: '測試專用', amount: 30, method: 'card', test: true },
]
const PLAN_INFO: Record<string, PlanRow> = Object.fromEntries(PLANS.map(p => [p.id, p]))

function PayContent() {
  const searchParams = useSearchParams()
  const registration_id = searchParams.get('id') || ''
  const random_code = searchParams.get('code') || ''

  const [reg, setReg] = useState<any>(null)
  const [plan, setPlan] = useState('A1')
  const [loadingInit, setLoadingInit] = useState(true)
  const [initError, setInitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!registration_id || !random_code) {
      setInitError('網址缺少參數，請從錄取通知信進入')
      setLoadingInit(false)
      return
    }
    fetch(`/api/lodging?id=${registration_id}&code=${encodeURIComponent(random_code)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '載入失敗')
        setReg(data.registration)
        if (data.registration?.payment_plan) {
          setPlan(data.registration.payment_plan)
        }
      })
      .catch(e => setInitError(e.message))
      .finally(() => setLoadingInit(false))
  }, [registration_id, random_code])

  const [transferForm, setTransferForm] = useState({
    last5: '',
    transfer_date: '',
    account_name: '',
  })
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferDone, setTransferDone] = useState(false)

  const handleTransferSubmit = async () => {
    setTransferLoading(true)
    setTransferError('')
    try {
      const res = await fetch('/api/payment/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id,
          plan,
          last5: transferForm.last5,
          transfer_date: transferForm.transfer_date,
          account_name: transferForm.account_name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTransferDone(true)
    } catch (err: any) {
      setTransferError(err.message)
    } finally {
      setTransferLoading(false)
    }
  }

  const selectedPlan = plan ? PLAN_INFO[plan] : null
  const isTransfer = selectedPlan?.method === 'transfer'

  const handlePay = async () => {
    if (!registration_id) {
      setError('找不到報名資料，請透過錄取通知信的連結進入')
      return
    }
    if (isTransfer) {
      setShowBank(true)
      setTimeout(() => {
        document.getElementById('bank-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id, plan }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.location.href = url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (loadingInit) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    )
  }

  if (initError) {
    return (
      <main className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-icon" style={{ background: 'linear-gradient(135deg,#cf8f6c,#8b4f32)' }}>!</div>
          <h1 className="login-title">無法載入</h1>
          <p className="login-subtitle">{initError}</p>
          <a href="/member" className="btn btn-primary btn-block">前往學員專區</a>
        </div>
      </main>
    )
  }

  const initial = reg?.chinese_name?.charAt(0) || '$'
  const paidStatus = reg?.payment_status

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href="/member/dashboard" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Member Portal</small>
              <span>學員專區</span>
            </span>
          </a>
          <div className="nav-actions">
            <a href="/member/dashboard" className="nav-back">← 學員首頁</a>
          </div>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Payment</p>
          <h1 className="page-title">食宿費用繳費</h1>
          <p className="page-subtitle">
            請於 <strong>6 月 15 日台北時間晚上 8 點前</strong>完成繳費。<br />
            繳費完成後系統會寄信邀請您完成食宿登記，方案內容會自動帶入食宿登記表。
          </p>
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
                    <span><strong>序號</strong>{reg.member_id || '待編號'}</span>
                    {reg.student_id && <span><strong>學號</strong>{reg.student_id}</span>}
                    <span><strong>繳費碼</strong>{random_code}</span>
                  </div>
                </div>
              </div>
            )}

            {paidStatus === 'verified' && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>繳費已確認</h4>
                  <p>您的繳費資料已由學會確認，本頁僅供參考。如有疑問請聯絡學會。</p>
                </div>
              </div>
            )}
            {paidStatus === 'paid' && (
              <div className="submit-status">
                <div className="submit-status-icon">⏳</div>
                <div className="submit-status-text">
                  <h4>繳費資訊已回報，待學會確認</h4>
                  <p>學會將於收到匯款後核對並通知您。如需更新可重新填寫下方表單。</p>
                </div>
              </div>
            )}

            <div className="alert-card">
              <div className="alert-card-title">繳費前請務必確認</div>
              <ul>
                <li>請於 <strong>2026/06/15 晚上 8 點前</strong>（台北時間）完成繳費。</li>
                <li>一旦繳費後取消報名，<strong>已付費用恕無法退款或轉讓</strong>。</li>
                <li>方案內容會自動帶入食宿登記表，請選擇對應的入住天數。</li>
              </ul>
            </div>

            <div className="form-card">
              <div className="step-header">
                <p className="step-header-kicker">Step 01</p>
                <h2 className="step-header-title">選擇費用方案</h2>
                <p className="step-header-desc">請依您預計入住的天數選擇方案，並選擇匯款或刷卡支付方式。</p>
              </div>

              <div className="opt-group">
                {PLANS.map(p => {
                  const checked = plan === p.id
                  return (
                    <label key={p.id} className={`opt ${checked ? 'selected' : ''}`}
                      style={p.test ? {
                        borderColor: checked ? 'var(--gold-deep)' : 'rgba(184, 133, 44, 0.4)',
                        background: checked ? 'rgba(216, 194, 154, 0.18)' : 'rgba(216, 194, 154, 0.08)',
                      } : undefined}>
                      <input type="radio" name="plan" value={p.id}
                        checked={checked}
                        onChange={() => { setPlan(p.id); setShowBank(false) }} />
                      <span className="opt-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <span>
                          <strong>{p.label}</strong>　<span style={{ color: 'var(--ink-mute)', fontWeight: 500, fontSize: 13 }}>{p.date}</span>
                          <small>{p.method === 'transfer' ? '匯款' : '信用卡刷卡'}{p.test ? '（測試專用）' : ''}</small>
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-cormorant), serif', fontWeight: 700,
                          fontSize: 18, color: p.test ? 'var(--gold-deep)' : 'var(--green-deep)',
                          letterSpacing: '0.04em', whiteSpace: 'nowrap',
                        }}>
                          NT${p.amount.toLocaleString()}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>

              {selectedPlan && (
                <div style={{
                  marginTop: 18, padding: '16px 20px',
                  background: 'rgba(73, 85, 52, 0.06)',
                  border: '1px solid rgba(73, 85, 52, 0.25)',
                  borderRadius: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: 12,
                }}>
                  <span style={{ fontFamily: 'var(--font-noto-serif-tc), serif', fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.06em' }}>
                    應付金額
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: 28, fontWeight: 700, color: 'var(--green-deep)',
                    letterSpacing: '0.05em',
                  }}>
                    NT${selectedPlan.amount.toLocaleString()}
                  </span>
                </div>
              )}

              {error && (
                <div className="alert-card" style={{ marginTop: 16 }}>
                  <div className="alert-card-title">{error}</div>
                </div>
              )}

              <div className="form-actions">
                <a href="/member/dashboard" className="btn btn-ghost">← 返回</a>
                <button onClick={handlePay} disabled={loading}
                  className="btn btn-primary">
                  {loading ? '處理中⋯' : isTransfer ? '查看匯款帳號' : '前往綠界刷卡付款'} <span className="arrow">→</span>
                </button>
              </div>
            </div>

            {/* 匯款帳號顯示 */}
            {showBank && (
              <div className="form-card" id="bank-info" style={{ marginTop: 24 }}>
                <div className="step-header">
                  <p className="step-header-kicker">Step 02</p>
                  <h2 className="step-header-title">匯款帳號資訊</h2>
                  <p className="step-header-desc">請依下列帳號完成匯款，匯款備註填寫您的姓名及繳費碼。</p>
                </div>

                <div className="field-group">
                  <div className="field-group-title"><span className="num">本國</span>台灣法友匯款</div>
                  <div className="info-row"><span className="k">戶名</span><span className="v">台灣四念處學會</span></div>
                  <div className="info-row"><span className="k">銀行</span><span className="v">第一銀行 仁和分行</span></div>
                  <div className="info-row"><span className="k">代號</span><span className="v">007</span></div>
                  <div className="info-row">
                    <span className="k">帳號</span>
                    <span className="v" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 18, letterSpacing: '0.08em', color: 'var(--green-deep)' }}>
                      16510068750
                    </span>
                  </div>
                </div>

                <div className="field-group">
                  <div className="field-group-title"><span className="num">海外</span>國外法友匯款</div>
                  <div className="info-row"><span className="k">戶名</span><span className="v">台灣四念處學會</span></div>
                  <div className="info-row"><span className="k">銀行</span><span className="v">第一銀行 仁和分行</span></div>
                  <div className="info-row"><span className="k">代號</span><span className="v">007</span></div>
                  <div className="info-row">
                    <span className="k">帳號</span>
                    <span className="v" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 18, letterSpacing: '0.08em', color: 'var(--green-deep)' }}>
                      16540016022
                    </span>
                  </div>
                </div>

                <div className="alert-card" style={{ marginTop: 8 }}>
                  <div className="alert-card-title">匯款注意事項</div>
                  <ul>
                    <li>匯款時請備注您的姓名及繳費碼：<strong style={{ letterSpacing: '0.12em' }}>{random_code}</strong></li>
                    <li>匯款完成後請填寫下方匯款資訊回報，並截圖上傳至學會 LINE 官方帳號。</li>
                    <li>請於 <strong>2026/06/15 晚上 8 點前</strong>完成匯款。</li>
                  </ul>
                </div>

                {/* 匯款回報表單 */}
                <div className="field-group">
                  <div className="field-group-title"><span className="num">回報</span>匯款完成後請填寫</div>
                  {transferDone ? (
                    <div className="submit-status">
                      <div className="submit-status-icon">✓</div>
                      <div className="submit-status-text">
                        <h4>匯款資訊已提交</h4>
                        <p>學會確認後將通知您完成正式錄取。如需更新可重新填寫送出。</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="field-row" style={{ gap: 14 }}>
                        <div>
                          <label className="form-label">匯款帳號後 5 碼 <span className="required">*</span></label>
                          <input type="text" maxLength={5} className="form-input"
                            placeholder="5 位數字"
                            value={transferForm.last5}
                            onChange={e => setTransferForm(prev => ({ ...prev, last5: e.target.value.replace(/\D/g, '') }))} />
                        </div>
                        <div>
                          <label className="form-label">匯款日期 <span className="required">*</span></label>
                          <input type="date" className="form-input"
                            value={transferForm.transfer_date}
                            onChange={e => setTransferForm(prev => ({ ...prev, transfer_date: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <label className="form-label">匯款人姓名</label>
                        <input type="text" className="form-input"
                          placeholder="若與報名姓名不同請填寫"
                          value={transferForm.account_name}
                          onChange={e => setTransferForm(prev => ({ ...prev, account_name: e.target.value }))} />
                      </div>

                      {transferError && (
                        <div className="alert-card" style={{ marginTop: 14 }}>
                          <div className="alert-card-title">{transferError}</div>
                        </div>
                      )}

                      <div className="form-actions">
                        <button onClick={handleTransferSubmit} disabled={transferLoading}
                          className="btn btn-primary btn-block">
                          {transferLoading ? '提交中⋯' : '確認提交匯款資訊'} <span className="arrow">→</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'var(--ink-mute)' }}>
              刷卡交易由綠界科技處理，安全加密。
            </p>
          </div>

          {/* Sidebar */}
          <aside>
            <div className="deadline-card">
              <div className="deadline-label">Deadline</div>
              <div className="deadline-date">06.15</div>
              <div className="deadline-text">
                台北時間晚上 <strong>8:00</strong> 前完成<br />
                逾期視同放棄錄取
              </div>
            </div>

            <div className="sidebar-card">
              <h4>方案說明 <small>About</small></h4>
              <div className="info-row">
                <span className="k">A 方案</span>
                <span className="v">8/20 — 8/24</span>
              </div>
              <div className="info-row">
                <span className="k">B 方案</span>
                <span className="v">8/19 — 8/24</span>
              </div>
              <div className="info-row">
                <span className="k">C 方案</span>
                <span className="v">8/19 — 8/25</span>
              </div>
              <div className="info-row">
                <span className="k">D 方案</span>
                <span className="v">8/20 — 8/25</span>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-mute)' }}>
                匯款方案較刷卡優惠，刷卡含金流手續費。
              </p>
            </div>

            <div className="sidebar-card" style={{ background: 'rgba(216, 194, 154, 0.18)', borderColor: 'rgba(180, 147, 88, 0.3)' }}>
              <h4 style={{ color: 'var(--gold-deep)' }}>※ 貼心提醒 <small>Tips</small></h4>
              <p>
                <strong>匯款</strong>方案：請務必於匯款備註中填寫您的姓名與繳費碼，並於下方回填匯款後 5 碼。
              </p>
              <p style={{ marginTop: 10 }}>
                <strong>刷卡</strong>方案：將跳轉到綠界第三方加密頁面，學會不會接觸您的卡號。
              </p>
              <p style={{ marginTop: 10 }}>
                <strong>已繳費後取消報名</strong>，已付費用恕無法退款、轉讓。
              </p>
            </div>

            <div className="sidebar-card">
              <h4>需要協助 <small>Help</small></h4>
              <p>聯絡學會：<br />
                <a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a>
              </p>
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

export default function PayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    }>
      <PayContent />
    </Suspense>
  )
}
