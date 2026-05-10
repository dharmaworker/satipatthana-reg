'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const MAX_CHANGES = 3

type Session = {
  id: string
  day_number: number
  session_date: string
  time_label: string
  title: string
  sort_order: number
  status: 'present' | 'absent' | null
  checked_in_at: string | null
  change_count: number
}

function formatDate(date: string) {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${m}/${day}（${weekdays[d.getDay()]}）`
}

function CheckinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const dashboardUrl = id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 2000)
  }

  useEffect(() => {
    if (!id || !code) { setError('網址缺少必要參數'); setLoading(false); return }
    fetch(`/api/member/course-checkin?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '載入失敗')
        setSessions(data.sessions)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, code])

  const setStatus = async (session: Session, next: 'present' | 'absent' | null) => {
    if (session.change_count >= MAX_CHANGES) return
    // 同一個狀態再點一次 → 清除
    const newStatus = session.status === next ? null : next
    setSaving(session.id)
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: newStatus, checked_in_at: newStatus ? new Date().toISOString() : null } : s))
    try {
      const res = await fetch('/api/member/course-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, session_id: session.id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, change_count: data.change_count ?? s.change_count } : s))
        showToast(newStatus === 'present' ? '已記錄出席' : newStatus === 'absent' ? '已記錄缺席' : '已取消記錄', true)
      } else {
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: session.status, checked_in_at: session.checked_in_at } : s))
        showToast(data.error || '儲存失敗，請再試一次', false)
      }
    } catch {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: session.status, checked_in_at: session.checked_in_at } : s))
      showToast('網路錯誤，請再試一次', false)
    } finally {
      setSaving(null)
    }
  }

  const byDay = sessions.reduce((acc, s) => {
    if (!acc[s.day_number]) acc[s.day_number] = { date: s.session_date, sessions: [] }
    acc[s.day_number].sessions.push(s)
    return acc
  }, {} as Record<number, { date: string; sessions: Session[] }>)

  const total = sessions.length
  const presentCount = sessions.filter(s => s.status === 'present').length
  const absentCount = sessions.filter(s => s.status === 'absent').length
  const unmarkedCount = total - presentCount - absentCount
  const rate = total > 0 ? Math.round(presentCount / total * 100) : 0

  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          color: toast.ok ? '#166534' : '#991b1b',
          border: `1.5px solid ${toast.ok ? '#86efac' : '#fca5a5'}`,
          padding: '10px 22px', borderRadius: 999,
          fontSize: 14, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          whiteSpace: 'nowrap',
        }}>
          {toast.message}
        </div>
      )}

      <div className="page-bg">
        <div className="page-blob b1" /><div className="page-blob b2" />
        <div className="page-blob b3" /><div className="page-blob b4" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href={dashboardUrl} className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel"><small>Member Portal</small><span>學員專區</span></span>
          </a>
          <div className="nav-actions">
            <a href={dashboardUrl} className="nav-back">← 學員專區</a>
            <button className="nav-logout" onClick={() => router.push('/member')}>登出</button>
          </div>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 780, paddingTop: 36, paddingBottom: 60 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>Course Attendance</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)', margin: '0 0 6px' }}>課程打卡</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>每次課程結束後請記錄出席或缺席，記錄自動儲存。</p>
        </div>

        {/* 打卡規則提醒 */}
        <div style={{ background: 'rgba(216,194,154,0.15)', border: '1px solid rgba(216,194,154,0.5)', borderRadius: 12, padding: '14px 18px', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-deep)', marginBottom: 8, letterSpacing: '0.04em' }}>📋 打卡注意事項</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 2 }}>
            <li>每個場次僅能修改 <strong style={{ color: 'var(--ink)' }}>3 次</strong>，請確認後再送出。</li>
            <li>須<strong style={{ color: 'var(--ink)' }}>全程出席（零缺席）</strong>方可取得完課資格；有任何缺席記錄將不計入參課。</li>
          </ul>
        </div>

        {error && (
          <div style={{ background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 10, padding: '14px 18px', color: '#b8523a', fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {!error && (
          <>
            {/* 出席摘要 */}
            {(() => {
              const disqualified = absentCount >= 1
              return (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 14 }}>出席摘要</h2>
                  {disqualified && (
                    <div style={{ background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.25)', borderRadius: 10, padding: '12px 16px', color: '#b8523a', fontSize: 13.5, marginBottom: 14, lineHeight: 1.7 }}>
                      有缺席記錄（{absentCount} 堂），出席次數不計入參課資格。
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: '已出席課程', value: disqualified ? '—' : presentCount, color: disqualified ? 'var(--ink-mute)' : 'var(--green)', bg: disqualified ? 'rgba(0,0,0,0.03)' : 'rgba(73,85,52,0.08)', border: disqualified ? 'var(--line)' : 'rgba(73,85,52,0.2)' },
                      { label: '缺席課程', value: absentCount, color: 'var(--error)', bg: 'rgba(184,82,58,0.06)', border: 'rgba(184,82,58,0.2)' },
                      { label: '出席率', value: disqualified ? '不計' : `${rate}%`, color: disqualified ? 'var(--ink-mute)' : (rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--gold-deep)' : 'var(--error)'), bg: 'rgba(251,248,242,0.9)', border: 'var(--line)' },
                    ].map(({ label, value, color, bg, border }) => (
                      <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 38, fontWeight: 700, color, lineHeight: 1, marginBottom: 6 }}>{value}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {unmarkedCount > 0 && (
                    <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 10, textAlign: 'right' }}>尚有 {unmarkedCount} 個場次未記錄</p>
                  )}
                </div>
              )
            })()}

            {/* 出席歷史 */}
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 14 }}>出席歷史（課程天數）</h2>

            {Object.entries(byDay).map(([dayNum, { date, sessions: daySessions }]) => {
              const dayPresent = daySessions.filter(s => s.status === 'present').length
              return (
                <div key={dayNum} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase' }}>
                      第 {dayNum} 日 · {formatDate(date)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>出席 {dayPresent} / {daySessions.length}</div>
                  </div>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line-strong)' }}>
                    {daySessions.map((s, idx) => (
                      <div key={s.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr auto',
                        alignItems: 'center', gap: 12, padding: '14px 16px',
                        borderTop: idx > 0 ? '1px solid var(--line)' : undefined,
                        background: s.status === 'present' ? 'rgba(73,85,52,0.04)' : s.status === 'absent' ? 'rgba(184,82,58,0.03)' : 'var(--bg-pure)',
                        transition: 'background 0.15s',
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{s.title}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', fontFamily: 'var(--font-cormorant), serif' }}>{s.time_label}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {s.change_count >= MAX_CHANGES ? (
                              <span style={{ fontSize: 12, color: 'var(--ink-mute)', padding: '6px 12px', border: '1.5px solid var(--line)', borderRadius: 999, background: 'rgba(0,0,0,0.03)' }}>已鎖定</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setStatus(s, 'present')}
                                  disabled={saving === s.id}
                                  style={{
                                    padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    border: '1.5px solid ' + (s.status === 'present' ? 'var(--green)' : 'var(--line-strong)'),
                                    background: s.status === 'present' ? 'var(--green)' : 'transparent',
                                    color: s.status === 'present' ? '#f8f2e8' : 'var(--ink-mute)',
                                    opacity: saving === s.id ? 0.5 : 1, transition: 'all 0.18s',
                                  }}>
                                  出席
                                </button>
                                <button
                                  onClick={() => setStatus(s, 'absent')}
                                  disabled={saving === s.id}
                                  style={{
                                    padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    border: '1.5px solid ' + (s.status === 'absent' ? 'var(--error)' : 'var(--line-strong)'),
                                    background: s.status === 'absent' ? 'var(--error)' : 'transparent',
                                    color: s.status === 'absent' ? '#f8f2e8' : 'var(--ink-mute)',
                                    opacity: saving === s.id ? 0.5 : 1, transition: 'all 0.18s',
                                  }}>
                                  缺席
                                </button>
                              </>
                            )}
                          </div>
                          {s.change_count > 0 && s.change_count < MAX_CHANGES && (
                            <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>剩 {MAX_CHANGES - s.change_count} 次可改</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--ink-mute)', textAlign: 'center', lineHeight: 1.7 }}>
              點擊「出席」或「缺席」記錄參課狀態，再次點擊同一按鈕可取消。
            </p>
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '32px 16px 48px', color: 'var(--ink-mute)', fontSize: 12.5 }}>
        <img src="/webpage/logo.webp" alt="" style={{ height: 28, opacity: 0.35, display: 'block', margin: '0 auto 10px' }} />
        © 2026 台灣四念處學會
      </footer>
    </>
  )
}

export default function CourseCheckinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <CheckinContent />
    </Suspense>
  )
}
