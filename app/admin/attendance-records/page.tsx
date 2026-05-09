'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

type Session = {
  id: string
  day_number: number
  session_date: string
  time_label: string
  title: string
  sort_order: number
  requires_checkin: boolean
  checked: number
  total: number
}

type Reg = {
  id: string
  chinese_name: string
  student_id: string | null
  member_id: string | null
}

function formatDate(date: string) {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${m}/${day}（${weekdays[d.getDay()]}）`
}

const VIEW_MODES = [
  { key: 'session', label: '依場次' },
  { key: 'student', label: '依學員' },
]

export default function AttendanceRecordsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [regs, setRegs] = useState<Reg[]>([])
  const [checkinMap, setCheckinMap] = useState<Record<string, Record<string, boolean>>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'session' | 'student'>('session')
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [togglingSession, setTogglingSession] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/course-sessions')
    if (res.status === 401) { router.push('/admin'); return }
    const data = await res.json()
    setSessions(data.sessions || [])
    setRegs(data.regs || [])
    setCheckinMap(data.checkin_map || {})
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const handler = (e: Event) => {
      const f = (e as CustomEvent<string>).detail
      if (f !== 'online') router.push('/admin/dashboard')
    }
    window.addEventListener('admin-format-change', handler)
    return () => window.removeEventListener('admin-format-change', handler)
  }, [])

  const toggleRequiresCheckin = async (session: Session) => {
    setTogglingSession(session.id)
    const next = !session.requires_checkin
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, requires_checkin: next } : s))
    await fetch('/api/admin/course-sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, requires_checkin: next }),
    })
    setTogglingSession(null)
  }

  const filteredRegs = regs.filter(r => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return r.chinese_name.toLowerCase().includes(q) || (r.student_id || '').toLowerCase().includes(q) || (r.member_id || '').toLowerCase().includes(q)
  })

  const checkinSessions = sessions.filter(s => s.requires_checkin)
  const byDay = sessions.reduce((acc, s) => {
    if (!acc[s.day_number]) acc[s.day_number] = { date: s.session_date, sessions: [] }
    acc[s.day_number].sessions.push(s)
    return acc
  }, {} as Record<number, { date: string; sessions: Session[] }>)

  const totalOnline = regs.length
  const totalSessions = checkinSessions.length
  const avgRate = totalOnline > 0 && totalSessions > 0
    ? Math.round(checkinSessions.reduce((sum, s) => sum + s.checked, 0) / (totalOnline * totalSessions) * 100)
    : 0

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', fontWeight: 700, fontSize: 12.5, color: 'var(--ink)',
    textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid var(--line-strong)',
    background: 'rgba(73,85,52,0.07)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '9px 12px', fontSize: 13, borderBottom: '1px solid var(--line)', color: 'var(--ink)',
  }

  return (
    <div className="admin-page">
      <AdminHeader />
      <div className="admin-main">

        {/* 統計 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { label: '線上學員', value: totalOnline, accent: 'var(--ink-mute)' },
            { label: '需打卡場次', value: totalSessions, accent: 'var(--gold-deep)' },
            { label: '平均打卡率', value: `${avgRate}%`, accent: 'var(--green)' },
            { label: '今日打卡總數', value: checkinSessions.reduce((s, c) => s + c.checked, 0), accent: 'var(--green)' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background: 'rgba(251,248,242,0.92)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 18px', textAlign: 'center', borderTop: `3px solid ${accent}` }}>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 36, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 8, fontWeight: 600, letterSpacing: '0.08em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div style={{ display: 'flex', gap: 6 }}>
            {VIEW_MODES.map(m => (
              <button key={m.key} onClick={() => setViewMode(m.key as any)}
                className={`admin-btn-sm ${viewMode === m.key ? 'active' : ''}`}
                style={{ background: viewMode === m.key ? 'var(--green)' : undefined, color: viewMode === m.key ? '#fff' : undefined }}>
                {m.label}
              </button>
            ))}
          </div>
          {viewMode === 'student' && (
            <input type="text" placeholder="搜尋姓名 / 序號 / 學號"
              value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          )}
          <button onClick={fetchData} className="admin-btn-sm">重新整理</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</div>
        ) : viewMode === 'session' ? (
          /* 依場次視圖 */
          <div>
            {Object.entries(byDay).map(([dayNum, { date, sessions: daySessions }]) => {
              const isOpen = expandedDay === Number(dayNum)
              return (
                <div key={dayNum} style={{ marginBottom: 12, border: '1px solid var(--line-strong)', borderRadius: 12, overflow: 'hidden' }}>
                  <button onClick={() => setExpandedDay(isOpen ? null : Number(dayNum))}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(73,85,52,0.05)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>
                      第 {dayNum} 日 · {formatDate(date)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'rgba(73,85,52,0.04)' }}>
                          <th style={thStyle}>時間</th>
                          <th style={thStyle}>場次</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>需打卡</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>已打卡</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>打卡率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daySessions.map(s => {
                          const rate = totalOnline > 0 ? Math.round(s.checked / totalOnline * 100) : 0
                          return (
                            <tr key={s.id}>
                              <td style={{ ...tdStyle, fontFamily: 'var(--font-cormorant), serif', fontSize: 14, color: 'var(--gold-deep)', whiteSpace: 'nowrap' }}>{s.time_label}</td>
                              <td style={{ ...tdStyle, fontWeight: 600 }}>{s.title}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <button onClick={() => toggleRequiresCheckin(s)} disabled={togglingSession === s.id}
                                  style={{ width: 28, height: 28, borderRadius: '50%', border: s.requires_checkin ? '2px solid var(--green)' : '2px solid var(--line-strong)', background: s.requires_checkin ? 'var(--green)' : 'transparent', color: s.requires_checkin ? '#fff' : 'var(--ink-mute)', fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: togglingSession === s.id ? 0.5 : 1 }}>
                                  {s.requires_checkin ? '✓' : ''}
                                </button>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: s.checked > 0 ? 'var(--green)' : 'var(--ink-mute)' }}>{s.checked} / {totalOnline}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: rate >= 80 ? 'rgba(73,85,52,0.12)' : rate >= 50 ? 'rgba(216,194,154,0.2)' : 'rgba(184,82,58,0.08)', color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--gold-deep)' : 'var(--error)' }}>
                                  {rate}%
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* 依學員視圖 */
          <div className="admin-table-card scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={thStyle}>姓名</th>
                  <th style={thStyle}>學號</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>打卡數</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>打卡率</th>
                  {checkinSessions.map(s => (
                    <th key={s.id} style={{ ...thStyle, textAlign: 'center', fontSize: 11, minWidth: 60 }}>
                      <div style={{ color: 'var(--gold-deep)' }}>D{s.day_number}</div>
                      <div style={{ fontWeight: 400, color: 'var(--ink-mute)', fontSize: 10 }}>{s.time_label.split(' — ')[0]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRegs.length === 0 ? (
                  <tr><td colSpan={4 + checkinSessions.length} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
                ) : filteredRegs.map(reg => {
                  const regCheckins = checkinMap[reg.id] || {}
                  const count = checkinSessions.filter(s => regCheckins[s.id]).length
                  const rate = totalSessions > 0 ? Math.round(count / totalSessions * 100) : 0
                  return (
                    <tr key={reg.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{reg.chinese_name}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--ink-mute)', fontSize: 12.5 }}>{reg.student_id || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{count} / {totalSessions}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: rate >= 80 ? 'rgba(73,85,52,0.12)' : rate >= 50 ? 'rgba(216,194,154,0.2)' : 'rgba(184,82,58,0.08)', color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--gold-deep)' : 'var(--error)' }}>
                          {rate}%
                        </span>
                      </td>
                      {checkinSessions.map(s => (
                        <td key={s.id} style={{ ...tdStyle, textAlign: 'center' }}>
                          {regCheckins[s.id] ? (
                            <span style={{ color: 'var(--green)', fontSize: 15 }}>✓</span>
                          ) : (
                            <span style={{ color: 'var(--line-strong)', fontSize: 13 }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
