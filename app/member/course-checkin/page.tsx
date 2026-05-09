'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Session = {
  id: string
  day_number: number
  session_date: string
  time_label: string
  title: string
  sort_order: number
  checked_in: boolean
  checked_in_at: string | null
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
  const [toggling, setToggling] = useState<string | null>(null)

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

  const toggle = async (session: Session) => {
    const next = !session.checked_in
    setToggling(session.id)
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, checked_in: next, checked_in_at: next ? new Date().toISOString() : null } : s))
    try {
      const res = await fetch('/api/member/course-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, session_id: session.id, checked_in: next }),
      })
      if (!res.ok) setSessions(prev => prev.map(s => s.id === session.id ? { ...s, checked_in: session.checked_in, checked_in_at: session.checked_in_at } : s))
    } catch {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, checked_in: session.checked_in, checked_in_at: session.checked_in_at } : s))
    } finally {
      setToggling(null)
    }
  }

  // Group by day
  const byDay = sessions.reduce((acc, s) => {
    const key = s.day_number
    if (!acc[key]) acc[key] = { date: s.session_date, sessions: [] }
    acc[key].sessions.push(s)
    return acc
  }, {} as Record<number, { date: string; sessions: Session[] }>)

  const checkedCount = sessions.filter(s => s.checked_in).length
  const total = sessions.length

  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>

  return (
    <>
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
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>請於每次課程結束後完成打卡，記錄自動儲存。</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 10, padding: '14px 18px', color: '#b8523a', fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {!error && (
          <>
            {/* 進度 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '14px 20px', background: 'var(--bg-pure)', border: '1px solid var(--line-strong)', borderRadius: 12 }}>
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>打卡進度</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: checkedCount === total && total > 0 ? 'var(--green)' : 'var(--ink)' }}>
                {checkedCount} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-mute)' }}>/ {total}</span>
              </span>
              {checkedCount === total && total > 0 && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✦ 全部完成</span>}
            </div>

            {/* 每日課程 */}
            {Object.entries(byDay).map(([dayNum, { date, sessions: daySessions }]) => (
              <div key={dayNum} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>
                  Day {dayNum} · {formatDate(date)}
                </div>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line-strong)' }}>
                  {daySessions.map((s, idx) => (
                    <div key={s.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto',
                      alignItems: 'center', gap: 12,
                      padding: '14px 18px',
                      borderTop: idx > 0 ? '1px solid var(--line)' : undefined,
                      background: s.checked_in ? 'rgba(73,85,52,0.04)' : 'var(--bg-pure)',
                      transition: 'background 0.15s',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{s.title}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', fontFamily: 'var(--font-cormorant), serif' }}>{s.time_label}</div>
                      </div>
                      <button
                        onClick={() => toggle(s)}
                        disabled={toggling === s.id}
                        aria-label={s.checked_in ? '取消打卡' : '打卡'}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          border: s.checked_in ? '2px solid var(--green)' : '2px solid var(--line-strong)',
                          background: s.checked_in ? 'var(--green)' : 'transparent',
                          color: s.checked_in ? '#f8f2e8' : 'var(--ink-mute)',
                          fontSize: 17, cursor: toggling === s.id ? 'not-allowed' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          opacity: toggling === s.id ? 0.5 : 1, transition: 'all 0.18s',
                        }}>
                        {s.checked_in ? '✓' : ''}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
