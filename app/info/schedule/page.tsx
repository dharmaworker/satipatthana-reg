'use client'
import { useState, useEffect } from 'react'

type Row = { time: string; title: string; desc: string; badge?: string }
type Day = { tabLabel: string; tabDate: string; title: string; date: string; desc: string; rows: Row[] }
type Timetable = { published: boolean; days: Day[] }

export default function SchedulePage() {
  const [data, setData] = useState<Timetable | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    fetch('/api/timetable')
      .then(r => r.json())
      .then((d: Timetable) => setData(d))
      .finally(() => setLoading(false))
  }, [])

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
          <a href="/member/dashboard" className="nav-back">← 返回學員專區</a>
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
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}>
            <div className="spinner-large" />
          </div>
        ) : !data?.published || data.days.length === 0 ? (
          <UnpublishedCard />
        ) : (
          <div className="schedule-card">
            <div className="schedule-tabs">
              {data.days.map((d, i) => (
                <button key={i}
                  className={`schedule-tab ${i === activeIdx ? 'active' : ''}`}
                  onClick={() => setActiveIdx(i)}>
                  <small>{d.tabLabel}</small>
                  {d.tabDate}
                </button>
              ))}
            </div>
            <div className="schedule-content">
              {data.days[activeIdx] && <DayContent day={data.days[activeIdx]} />}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/member/dashboard" className="btn btn-ghost">← 返回學員專區</a>
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

function UnpublishedCard() {
  return (
    <div className="card with-line" style={{ textAlign: 'center', padding: '60px 40px', maxWidth: 560, margin: '40px auto' }}>
      <div style={{
        width: 64, height: 64,
        borderRadius: '50%',
        background: 'rgba(216, 194, 154, 0.3)',
        color: 'var(--gold-deep)',
        fontSize: 28,
        display: 'grid',
        placeItems: 'center',
        margin: '0 auto 18px',
      }}>📅</div>
      <h2 style={{
        fontFamily: 'var(--font-noto-serif-tc), serif',
        fontSize: 22, fontWeight: 700,
        color: 'var(--ink)', letterSpacing: '0.08em',
        marginBottom: 12,
      }}>課程時間表尚未發佈</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.85 }}>
        詳細的課程時間表將於課程開始前公布。<br />
        如有任何疑問請<a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'var(--green)', fontWeight: 600 }}>聯繫學會</a>。
      </p>
    </div>
  )
}
