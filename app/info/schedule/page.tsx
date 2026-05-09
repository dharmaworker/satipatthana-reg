'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

type Row = { time: string; title: string; desc: string; badge?: string }
type Day = { tabLabel: string; tabDate: string; title: string; date: string; desc: string; rows: Row[] }
type Timetable = { published: boolean; zoom_link?: string; zoom_meeting_id?: string; zoom_password?: string; days: Day[] }

type State =
  | { kind: 'loading' }
  | { kind: 'need_login' }
  | { kind: 'not_approved' }
  | { kind: 'unpublished' }
  | { kind: 'ok'; data: Timetable }

function ScheduleContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [state, setState] = useState<State>({ kind: 'loading' })
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    if (!id || !code) { setState({ kind: 'need_login' }); return }
    fetch(`/api/timetable?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const d = await r.json()
        if (r.status === 401) { setState({ kind: 'need_login' }); return }
        if (r.status === 403) { setState({ kind: 'not_approved' }); return }
        if (!d.published) { setState({ kind: 'unpublished' }); return }
        setState({ kind: 'ok', data: d })
      })
      .catch(() => setState({ kind: 'need_login' }))
  }, [id, code])

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
          <a href={id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'} className="nav-back">← 返回學員專區</a>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Daily Schedule</p>
          <h1 className="page-title">完整課程時間表</h1>
          <p className="page-subtitle">五日禪修的詳細課程安排，含所有禪坐、法談、互動時段。</p>
        </div>
      </div>

      <main className="container" style={{ paddingBottom: 80, position: 'relative', zIndex: 1 }}>
        {state.kind === 'loading' && (
          <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}>
            <div className="spinner-large" />
          </div>
        )}
        {state.kind === 'need_login' && <NeedLoginCard />}
        {state.kind === 'not_approved' && <NotApprovedCard />}
        {state.kind === 'unpublished' && <UnpublishedCard />}
        {state.kind === 'ok' && (
          <div className="schedule-card">
            {(state.data.zoom_link || state.data.zoom_meeting_id) && (
              <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginRight: 4 }}>本次課程提供線上 Zoom 連線</span>
                {state.data.zoom_meeting_id && (
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--ink-mute)', marginRight: 5 }}>會議號</span>
                    <strong style={{ letterSpacing: '0.08em' }}>{state.data.zoom_meeting_id}</strong>
                  </span>
                )}
                {state.data.zoom_password && (
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--ink-mute)', marginRight: 5 }}>密碼</span>
                    <strong>{state.data.zoom_password}</strong>
                  </span>
                )}
                {state.data.zoom_link && (
                  <a href={state.data.zoom_link} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 14px',
                      background: 'rgba(35, 130, 244, 0.1)', border: '1px solid rgba(35, 130, 244, 0.3)',
                      borderRadius: 6, color: '#1d6fcc', fontSize: 13, fontWeight: 600,
                      textDecoration: 'none',
                    }}>
                    📹 加入 Zoom
                  </a>
                )}
              </div>
            )}
            <div className="schedule-tabs">
              {state.data.days.map((d, i) => (
                <button key={i}
                  className={`schedule-tab ${i === activeIdx ? 'active' : ''}`}
                  onClick={() => setActiveIdx(i)}>
                  <small>{d.tabLabel}</small>
                  {d.tabDate}
                </button>
              ))}
            </div>
            <div className="schedule-content">
              {state.data.days[activeIdx] && <DayContent day={state.data.days[activeIdx]} />}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href={id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'}
            className="btn btn-ghost">← 返回學員專區</a>
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

function DayContent({ day }: { day: Day }) {
  return (
    <>
      <div className="day-header">
        <div className="day-no">{day.tabLabel} · {day.date}</div>
        <h3>{day.title}</h3>
        <p>{day.desc}</p>
      </div>
      {day.rows.map((r, i) => (
        <div key={i} className="schedule-row">
          <div className="schedule-time">{r.time}</div>
          <div className="schedule-activity">
            <h4>
              {r.title}
              {r.badge === 'gold' && <span className="badge gold">重點</span>}
            </h4>
            {r.desc && <p>{r.desc}</p>}
          </div>
        </div>
      ))}
    </>
  )
}

function StatusCard({ icon, title, desc, action }: { icon: string; title: string; desc: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card with-line" style={{ textAlign: 'center', padding: '60px 40px', maxWidth: 560, margin: '40px auto' }}>
      <div style={{
        width: 64, height: 64,
        borderRadius: '50%',
        background: 'rgba(216, 194, 154, 0.3)',
        color: 'var(--gold-deep)',
        fontSize: 28,
        display: 'grid', placeItems: 'center',
        margin: '0 auto 18px',
      }}>{icon}</div>
      <h2 style={{
        fontFamily: 'var(--font-noto-serif-tc), serif',
        fontSize: 22, fontWeight: 700,
        color: 'var(--ink)', letterSpacing: '0.08em',
        marginBottom: 12,
      }}>{title}</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.85 }}>{desc}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

function NeedLoginCard() {
  return (
    <StatusCard icon="🔐"
      title="請先登入學員專區"
      desc={<>本頁僅限<strong>已錄取</strong>學員瀏覽。<br />請從學員專區進入。</>}
      action={<a href="/member" className="btn btn-primary">前往學員專區登入 <span className="arrow">→</span></a>} />
  )
}

function NotApprovedCard() {
  return (
    <StatusCard icon="⏳"
      title="本頁僅限錄取學員瀏覽"
      desc={<>您目前的報名狀態尚未錄取，課程時間表將於錄取後開放查閱。<br />如有疑問請<a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'var(--green)', fontWeight: 600 }}>聯繫學會</a>。</>} />
  )
}

function UnpublishedCard() {
  return (
    <StatusCard icon="📅"
      title="課程時間表尚未發佈"
      desc={<>詳細的課程時間表將於課程開始前公布。<br />如有任何疑問請<a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'var(--green)', fontWeight: 600 }}>聯繫學會</a>。</>} />
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    }>
      <ScheduleContent />
    </Suspense>
  )
}
