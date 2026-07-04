'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

type Row = { rid?: string; time: string; title: string; desc: string; badge?: string }
type Day = { tabLabel: string; tabDate: string; title: string; date: string; desc: string; rows: Row[] }
type Timetable = { zoom_link?: string; zoom_meeting_id?: string; zoom_password?: string; zoom_login_name?: string; days: Day[]; is_online?: boolean }

// 打卡：rid → 該場次的打卡狀態
type CheckinInfo = { session_id: string; status: 'present' | 'absent' | null }
type CheckinMap = Map<string, CheckinInfo>

type CheckinCtx = {
  map: CheckinMap
  saving: string | null           // 正在存的 session_id
  onToggle: (rid: string, next: 'present' | 'absent') => void
}

type State =
  | { kind: 'loading' }
  | { kind: 'need_login' }
  | { kind: 'not_approved' }
  | { kind: 'unpublished' }
  | { kind: 'ok'; data: Timetable }


function getWeekday(dateStr: string): string {
  const DAYS = ['日', '一', '二', '三', '四', '五', '六']
  try {
    const m = dateStr.match(/(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})/)
    if (!m) return ''
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
    return `星期${DAYS[d.getDay()]}`
  } catch { return '' }
}

function ZoomCard({ data, id, code }: { data: Timetable; id: string; code: string }) {
  if (!data.zoom_link && !data.zoom_meeting_id) return null
  return (
    <div style={{
      position: 'relative',
      borderRadius: 24,
      border: '1px solid rgba(120,90,54,.18)',
      background: '#fffdf7',
      boxShadow: '0 12px 32px rgba(65,45,25,.08)',
      padding: '22px 26px 22px 42px',
      marginBottom: 32,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 5, background: '#52613f', borderRadius: '24px 0 0 24px',
      }}/>
      <p style={{
        margin: '0 0 12px',
        fontFamily: 'var(--font-cormorant), serif',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
        color: '#52613f', textTransform: 'uppercase',
      }}>Online Session · Zoom</p>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#5a4e40', lineHeight: 1.65 }}>
        本次課程提供線上 Zoom 連線{data.is_online && '（全員不開鏡）'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 24, rowGap: 8, alignItems: 'baseline', fontSize: 13.5 }}>
        {data.zoom_meeting_id && <>
          <span style={{ color: '#8d7a66', whiteSpace: 'nowrap' }}>會議編號</span>
          <strong style={{ color: '#34291f', letterSpacing: '0.06em' }}>{data.zoom_meeting_id}</strong>
        </>}
        {data.zoom_password && <>
          <span style={{ color: '#8d7a66', whiteSpace: 'nowrap' }}>密碼</span>
          <strong style={{ color: '#34291f' }}>{data.zoom_password}</strong>
        </>}
        <span style={{ color: '#8d7a66', whiteSpace: 'nowrap' }}>登錄名</span>
        <span style={{ color: '#34291f' }}>{data.zoom_login_name || '學號 + 英文姓名／姓名拼音'}</span>
        {data.zoom_link && <>
          <span style={{ color: '#8d7a66', whiteSpace: 'nowrap' }}>Zoom 連結</span>
          <a href={data.zoom_link} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 12px', borderRadius: 6,
              background: 'rgba(35,130,244,.1)', border: '1px solid rgba(35,130,244,.3)',
              color: '#1d6fcc', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
            加入 Zoom →
          </a>
        </>}
      </div>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(120,90,54,.12)' }}>
        <a href={`/info/zoom-guide?id=${id}&code=${encodeURIComponent(code)}`}
          style={{ fontSize: 13, color: '#a06f31', fontWeight: 600, textDecoration: 'none' }}>
          Zoom 使用指南（設備準備、下載、加入步驟、同聲傳譯）→
        </a>
      </div>
    </div>
  )
}

function CheckinSummary({ present, absent, total }: { present: number; absent: number; total: number }) {
  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  const cell = (label: string, value: string | number, color: string) => (
    <div style={{ flex: 1, textAlign: 'center', padding: '4px 8px' }}>
      <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 30, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#8d7a66', marginTop: 4, letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
  return (
    <div style={{
      background: '#fffdf7', border: '1px solid rgba(120,90,54,.18)', borderRadius: 20,
      boxShadow: '0 6px 18px rgba(65,45,25,.07)', padding: '18px 20px', marginBottom: 28,
    }}>
      <p style={{
        margin: '0 0 12px', fontFamily: 'var(--font-cormorant), serif',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: '#a06f31', textTransform: 'uppercase',
      }}>Course Attendance · 課程打卡</p>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {cell('已出席', present, '#52613f')}
        {cell('缺席', absent, '#c2592a')}
        {cell('需打卡場次', total, '#34291f')}
        {cell('出席率', `${rate}%`, '#a06f31')}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#8d7a66', lineHeight: 1.7, textAlign: 'center' }}>
        於下方時間表中標示「需打卡」的場次記錄出席／缺席，記錄自動儲存。須全程出席（零缺席）方可取得完課資格。
      </p>
    </div>
  )
}

function DayNav({ days }: { days: Day[] }) {
  return (
    <nav className="cs-nav" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
      {days.map((d, i) => (
        <a key={i} href={`#day-${i}`} className="cs-nav-item">
          <span style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
            color: '#a06f31', textTransform: 'uppercase', lineHeight: 1,
          }}>{d.tabLabel}</span>
          <span style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 22, fontWeight: 700,
            color: '#34291f', lineHeight: 1.2,
            letterSpacing: '0.01em',
          }}>{d.tabDate}</span>
        </a>
      ))}
    </nav>
  )
}

function CheckinControl({ info, saving, onToggle }: { info: CheckinInfo; saving: boolean; onToggle: (next: 'present' | 'absent') => void }) {
  const btn = (active: boolean, kind: 'present' | 'absent') => {
    const color = kind === 'present' ? '#52613f' : '#c2592a'
    return {
      flex: '0 0 auto', minWidth: 92, padding: '8px 22px', borderRadius: 999,
      fontSize: 13.5, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
      border: `1.5px solid ${active ? color : 'rgba(120,90,54,.28)'}`,
      background: active ? color : '#fff',
      color: active ? '#fff' : '#8d7a66',
      transition: 'all .15s', letterSpacing: '0.04em',
    } as React.CSSProperties
  }
  return (
    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', color: '#a06f31', textTransform: 'uppercase', marginRight: 2 }}>打卡</span>
      <button disabled={saving} style={btn(info.status === 'present', 'present')} onClick={() => onToggle('present')}>出席</button>
      <button disabled={saving} style={btn(info.status === 'absent', 'absent')} onClick={() => onToggle('absent')}>缺席</button>
      {info.status && <span style={{ fontSize: 12, color: '#8d7a66' }}>{info.status === 'present' ? '已記錄出席' : '已記錄缺席'}</span>}
    </div>
  )
}

function EventRow({ row, checkin }: { row: Row; checkin?: CheckinCtx }) {
  const info = row.rid && checkin ? checkin.map.get(row.rid) : undefined
  return (
    <div className="cs-event">
      <div style={{
        fontFamily: 'var(--font-cormorant), serif',
        fontSize: 18, fontWeight: 600, color: '#a06f31',
        letterSpacing: '0.03em', lineHeight: 1.2, marginBottom: 3,
      }}>{row.time}</div>
      <div style={{
        fontFamily: 'var(--font-noto-serif-tc), serif',
        fontSize: 16, fontWeight: 600, color: '#34291f',
        letterSpacing: '0.04em', lineHeight: 1.35,
      }}>
        {row.title}
        {row.badge === 'gold' && (
          <mark style={{
            background: 'rgba(194,89,42,.12)',
            color: '#c2592a',
            fontSize: 11, fontWeight: 700,
            padding: '1px 7px', borderRadius: 4,
            marginLeft: 8, letterSpacing: '0.06em',
            fontFamily: 'var(--font-noto-serif-tc), serif',
          }}>重點</mark>
        )}
        {info && (
          <mark style={{
            background: 'rgba(82,97,63,.12)', color: '#52613f',
            fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
            marginLeft: 8, letterSpacing: '0.06em',
            fontFamily: 'var(--font-noto-serif-tc), serif',
          }}>需打卡</mark>
        )}
      </div>
      {row.desc && (
        <p style={{ margin: '5px 0 0', fontSize: 13.5, color: '#8d7a66', lineHeight: 1.7 }}>{row.desc}</p>
      )}
      {info && checkin && (
        <CheckinControl info={info} saving={checkin.saving === info.session_id}
          onToggle={(next) => checkin.onToggle(row.rid!, next)} />
      )}
    </div>
  )
}

function DayArticle({ day, idx, checkin }: { day: Day; idx: number; checkin?: CheckinCtx }) {
  const weekday = getWeekday(day.date)
  return (
    <article id={`day-${idx}`} className="cs-dayart">
      <div className="cs-datecol">
        <div style={{
          background: '#fffdf7',
          border: '1px solid rgba(120,90,54,.16)',
          borderRadius: 20,
          padding: '22px 16px',
          textAlign: 'center',
          boxShadow: '0 6px 18px rgba(65,45,25,.07)',
        }}>
          <div style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            color: '#a06f31', textTransform: 'uppercase',
            marginBottom: 8,
          }}>{day.tabLabel}</div>
          <div style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 38, fontWeight: 700, lineHeight: 1,
            color: '#34291f', letterSpacing: '-0.01em',
          }}>{day.tabDate}</div>
          {weekday && (
            <div style={{
              fontFamily: 'var(--font-noto-serif-tc), serif',
              fontSize: 12.5, color: '#8d7a66', marginTop: 10, letterSpacing: '0.08em',
            }}>{weekday}</div>
          )}
        </div>
      </div>
      <div>
        <div style={{
          background: '#fffdf7',
          border: '1px solid rgba(120,90,54,.16)',
          borderRadius: 20,
          boxShadow: '0 6px 18px rgba(65,45,25,.07)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '22px 26px 18px',
            borderBottom: '1px solid rgba(120,90,54,.1)',
          }}>
            {day.date && (
              <p style={{
                margin: '0 0 6px',
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 13, color: '#8d7a66', letterSpacing: '0.1em',
              }}>{day.date}</p>
            )}
            <h2 style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-noto-serif-tc), serif',
              fontSize: 20, fontWeight: 700, color: '#34291f',
              letterSpacing: '0.06em',
            }}>{day.title}</h2>
            {day.desc && (
              <p style={{ margin: 0, fontSize: 13.5, color: '#8d7a66', lineHeight: 1.75 }}>{day.desc}</p>
            )}
          </div>
          <div className="cs-events">
            {day.rows.map((r, i) => <EventRow key={r.rid || i} row={r} checkin={checkin}/>)}
          </div>
        </div>
      </div>
    </article>
  )
}

function ScheduleContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [checkins, setCheckins] = useState<CheckinMap>(new Map())
  const [hasCheckin, setHasCheckin] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 2000)
  }

  useEffect(() => {
    if (!id || !code) { setState({ kind: 'need_login' }); return }
    fetch(`/api/timetable?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const d = await r.json()
        if (r.status === 401) { setState({ kind: 'need_login' }); return }
        if (r.status === 403) { setState({ kind: 'not_approved' }); return }
        if (!d.published) { setState({ kind: 'unpublished' }); return }
        setState({ kind: 'ok', data: d })
        // 線上學員：載入打卡場次（依 rid 對應到時間表列）
        if (d.is_online) {
          fetch(`/api/member/course-checkin?id=${id}&code=${encodeURIComponent(code)}`)
            .then(res => res.ok ? res.json() : null)
            .then(cd => {
              if (!cd?.sessions) return
              const m: CheckinMap = new Map()
              for (const s of cd.sessions) {
                if (s.sync_key) m.set(s.sync_key, { session_id: s.id, status: s.status })
              }
              setCheckins(m)
              setHasCheckin(m.size > 0)
            })
            .catch(() => {})
        }
      })
      .catch(() => setState({ kind: 'need_login' }))
  }, [id, code])

  const toggleCheckin = async (rid: string, next: 'present' | 'absent') => {
    const info = checkins.get(rid)
    if (!info) return
    const newStatus = info.status === next ? null : next   // 再點同一個 → 清除
    setSaving(info.session_id)
    // 樂觀更新
    setCheckins(prev => {
      const m = new Map(prev)
      m.set(rid, { ...info, status: newStatus })
      return m
    })
    try {
      const res = await fetch('/api/member/course-checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, session_id: info.session_id, status: newStatus }),
      })
      if (res.status === 409) {
        showToast('課表已更新，請重新整理頁面', false)
      } else if (!res.ok) {
        throw new Error()
      } else {
        showToast(newStatus === 'present' ? '已記錄出席' : newStatus === 'absent' ? '已記錄缺席' : '已清除', true)
      }
    } catch {
      // 還原
      setCheckins(prev => {
        const m = new Map(prev)
        m.set(rid, { ...info })
        return m
      })
      showToast('儲存失敗，請再試一次', false)
    } finally {
      setSaving(null)
    }
  }

  const checkinCtx: CheckinCtx = { map: checkins, saving, onToggle: toggleCheckin }

  // 出席摘要
  const summary = (() => {
    let present = 0, absent = 0
    checkins.forEach(c => { if (c.status === 'present') present++; else if (c.status === 'absent') absent++ })
    return { present, absent, total: checkins.size }
  })()

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 15% 8%, rgba(255,255,255,.92) 0 10%, transparent 34%),
          radial-gradient(circle at 78% 20%, rgba(216,163,96,.22) 0 10%, transparent 32%),
          radial-gradient(circle at 12% 80%, rgba(112,132,86,.13) 0 8%, transparent 30%),
          linear-gradient(135deg, #fbf5eb, #f7efe3)
        `,
      }}/>
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(120,90,54,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(120,90,54,.03) 1px, transparent 1px)',
        backgroundSize: '42px 42px',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,.72), transparent 75%)',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,.72), transparent 75%)',
      }}/>

      <header className="site-header">
        <div className="container nav">
          <a href="/" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
          </a>
          <a href={id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'} className="nav-back">← 返回學員專區</a>
        </div>
      </header>

      <div className="page-header">
        <div className="container" style={{ textAlign: 'center' }}>
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
          <>
            <ZoomCard data={state.data} id={id} code={code}/>
            {hasCheckin && <CheckinSummary present={summary.present} absent={summary.absent} total={summary.total} />}
            <DayNav days={state.data.days}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
              {state.data.days.map((d, i) => <DayArticle key={i} day={d} idx={i} checkin={hasCheckin ? checkinCtx : undefined}/>)}
            </div>
          </>
        )}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <a href={id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'}
            className="btn btn-ghost">← 返回學員專區</a>
        </div>
      </main>

      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          zIndex: 50, padding: '10px 22px', borderRadius: 999,
          background: toast.ok ? '#52613f' : '#c2592a', color: '#fff',
          fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.18)',
        }}>{toast.message}</div>
      )}

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

function StatusCard({ icon, title, desc, action }: { icon: string; title: string; desc: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card with-line" style={{ textAlign: 'center', padding: '60px 40px', maxWidth: 560, margin: '40px auto' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(216, 194, 154, 0.3)', color: 'var(--gold-deep)',
        fontSize: 28, display: 'grid', placeItems: 'center',
        margin: '0 auto 18px',
      }}>{icon}</div>
      <h2 style={{
        fontFamily: 'var(--font-noto-serif-tc), serif',
        fontSize: 22, fontWeight: 700,
        color: 'var(--ink)', letterSpacing: '0.08em', marginBottom: 12,
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
