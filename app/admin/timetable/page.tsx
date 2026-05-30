'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

type Row = { time: string; title: string; desc: string; badge?: string }
type Day = { tabLabel: string; tabDate: string; title: string; date: string; desc: string; rows: Row[] }
type Timetable = { publish_at?: string | null; zoom_link?: string; zoom_meeting_id?: string; zoom_password?: string; days: Day[] }

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMPTY_ROW: Row = { time: '', title: '', desc: '', badge: '' }
const EMPTY_DAY: Day = { tabLabel: 'Day X', tabDate: '', title: '', date: '', desc: '', rows: [{ ...EMPTY_ROW }] }

export default function TimetableAdminPage() {
  const router = useRouter()
  const [data, setData] = useState<Timetable | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/timetable')
    if (res.status === 401 || res.status === 403) { router.push('/admin'); return }
    const d = await res.json()
    setData(d)
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const save = async () => {
    if (!data) return
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/admin/timetable', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(d.error || '儲存失敗')
    } else {
      setMessage('已儲存 ✓')
      setTimeout(() => setMessage(''), 2500)
    }
    setSaving(false)
  }

  const setPublishAt = (val: string) => data && setData({ ...data, publish_at: val ? new Date(val).toISOString() : null })

  const updateDay = (idx: number, patch: Partial<Day>) => {
    if (!data) return
    const days = data.days.map((d, i) => i === idx ? { ...d, ...patch } : d)
    setData({ ...data, days })
  }
  const addDay = () => data && setData({ ...data, days: [...data.days, { ...EMPTY_DAY, rows: [{ ...EMPTY_ROW }] }] })
  const removeDay = (idx: number) => {
    if (!data) return
    if (!confirm(`確定刪除「${data.days[idx]?.title || `Day ${idx + 1}`}」？`)) return
    setData({ ...data, days: data.days.filter((_, i) => i !== idx) })
  }
  const moveDay = (idx: number, dir: -1 | 1) => {
    if (!data) return
    const target = idx + dir
    if (target < 0 || target >= data.days.length) return
    const days = [...data.days]
    ;[days[idx], days[target]] = [days[target], days[idx]]
    setData({ ...data, days })
  }

  const updateRow = (dayIdx: number, rowIdx: number, patch: Partial<Row>) => {
    if (!data) return
    const days = data.days.map((d, i) => {
      if (i !== dayIdx) return d
      const rows = d.rows.map((r, j) => j === rowIdx ? { ...r, ...patch } : r)
      return { ...d, rows }
    })
    setData({ ...data, days })
  }
  const addRow = (dayIdx: number) => {
    if (!data) return
    const days = data.days.map((d, i) => i === dayIdx ? { ...d, rows: [...d.rows, { ...EMPTY_ROW }] } : d)
    setData({ ...data, days })
  }
  const removeRow = (dayIdx: number, rowIdx: number) => {
    if (!data) return
    const days = data.days.map((d, i) => {
      if (i !== dayIdx) return d
      return { ...d, rows: d.rows.filter((_, j) => j !== rowIdx) }
    })
    setData({ ...data, days })
  }
  const moveRow = (dayIdx: number, rowIdx: number, dir: -1 | 1) => {
    if (!data) return
    const days = data.days.map((d, i) => {
      if (i !== dayIdx) return d
      const target = rowIdx + dir
      if (target < 0 || target >= d.rows.length) return d
      const rows = [...d.rows]
      ;[rows[rowIdx], rows[target]] = [rows[target], rows[rowIdx]]
      return { ...d, rows }
    })
    setData({ ...data, days })
  }

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main" style={{ maxWidth: 1100 }}>
        <div className="admin-info-strip" style={{ background: 'rgba(73, 85, 52, 0.05)', borderLeftColor: 'var(--green)' }}>
          <p>📅 編輯課程時間表，學員會在 <strong>學員專區 → 課程時間表</strong> 看到。</p>
          <p>💡 課程表公開時間請至「時程設定」tab 設定。</p>
          <p>↕ 每日內可上下調整時段順序，整日也可調整順序。「重點」會顯示金色 badge。</p>
        </div>

        <div className="admin-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>Zoom 會議編號</span>
            <input className="form-input" style={{ width: 140, padding: '5px 10px', fontSize: 13 }}
              placeholder="123 456 7890"
              value={data?.zoom_meeting_id || ''}
              disabled={loading}
              onChange={e => data && setData({ ...data, zoom_meeting_id: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>Zoom 密碼</span>
            <input className="form-input" style={{ width: 120, padding: '5px 10px', fontSize: 13 }}
              placeholder="密碼"
              value={data?.zoom_password || ''}
              disabled={loading}
              onChange={e => data && setData({ ...data, zoom_password: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>Zoom 連結</span>
            <input className="form-input" style={{ width: 260, padding: '5px 10px', fontSize: 13 }}
              placeholder="https://zoom.us/j/... （選填）"
              value={data?.zoom_link || ''}
              disabled={loading}
              onChange={e => data && setData({ ...data, zoom_link: e.target.value })} />
          </div>
          <button onClick={addDay} disabled={loading} className="admin-btn-sm">+ 新增日次</button>
          <button onClick={fetchData} disabled={loading || saving} className="admin-btn-sm">重新載入</button>
          <button onClick={save} disabled={loading || saving} className="admin-btn-sm primary">
            {saving ? '儲存中⋯' : '儲存變更'}
          </button>
          {message && (
            <span style={{ fontSize: 13, color: message.includes('✓') ? 'var(--green-deep)' : 'var(--error)', fontWeight: 600 }}>
              {message}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}>
            <div className="spinner-large" />
          </div>
        ) : !data ? null : data.days.length === 0 ? (
          <div className="admin-table-card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>
            尚未建立任何日次。點上方「新增日次」開始。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.days.map((day, dIdx) => (
              <DayEditor key={dIdx}
                day={day} idx={dIdx} totalDays={data.days.length}
                onChange={patch => updateDay(dIdx, patch)}
                onRemove={() => removeDay(dIdx)}
                onMove={dir => moveDay(dIdx, dir)}
                onRowChange={(rIdx, patch) => updateRow(dIdx, rIdx, patch)}
                onRowAdd={() => addRow(dIdx)}
                onRowRemove={rIdx => removeRow(dIdx, rIdx)}
                onRowMove={(rIdx, dir) => moveRow(dIdx, rIdx, dir)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DayEditor({ day, idx, totalDays, onChange, onRemove, onMove, onRowChange, onRowAdd, onRowRemove, onRowMove }: {
  day: Day; idx: number; totalDays: number
  onChange: (patch: Partial<Day>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onRowChange: (rIdx: number, patch: Partial<Row>) => void
  onRowAdd: () => void
  onRowRemove: (rIdx: number) => void
  onRowMove: (rIdx: number, dir: -1 | 1) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="admin-table-card" style={{ overflow: 'visible' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
        background: 'rgba(73, 85, 52, 0.06)',
        borderBottom: open ? '1px solid var(--line)' : 'none',
        flexWrap: 'wrap',
      }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-soft)', padding: 0 }}>
          {open ? '▼' : '▶'}
        </button>
        <strong style={{ fontFamily: 'var(--font-noto-serif-tc), serif', color: 'var(--ink)', letterSpacing: '0.06em', fontSize: 15 }}>
          Day {idx + 1}
        </strong>
        <span style={{ color: 'var(--ink-mute)', fontSize: 13 }}>
          {day.title || '（未命名）'}
          {day.date && <>　·　{day.date}</>}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-mute)', fontSize: 12.5 }}>{day.rows.length} 個時段</span>
        <button onClick={() => onMove(-1)} disabled={idx === 0} className="admin-btn-sm" title="上移">↑</button>
        <button onClick={() => onMove(1)} disabled={idx === totalDays - 1} className="admin-btn-sm" title="下移">↓</button>
        <button onClick={onRemove} className="admin-btn-sm danger">刪除</button>
      </div>

      {open && (
        <div style={{ padding: '18px 22px' }}>
          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 12 }}>
            <div>
              <label className="form-label">Tab 標籤</label>
              <input className="form-input" placeholder="例：Day 1" value={day.tabLabel}
                onChange={e => onChange({ tabLabel: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Tab 副標</label>
              <input className="form-input" placeholder="例：08/20 開課" value={day.tabDate}
                onChange={e => onChange({ tabDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">日期</label>
              <input className="form-input" placeholder="例：2026 年 8 月 20 日（四）" value={day.date}
                onChange={e => onChange({ date: e.target.value })} />
            </div>
          </div>
          <div className="field-row" style={{ gridTemplateColumns: '1fr 2fr', marginBottom: 12 }}>
            <div>
              <label className="form-label">日次標題</label>
              <input className="form-input" placeholder="例：第一日 · 開課" value={day.title}
                onChange={e => onChange({ title: e.target.value })} />
            </div>
            <div>
              <label className="form-label">當日描述</label>
              <input className="form-input" placeholder="例：報到、開營、第一堂法談" value={day.desc}
                onChange={e => onChange({ desc: e.target.value })} />
            </div>
          </div>

          <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <h4 style={{ fontFamily: 'var(--font-noto-serif-tc), serif', color: 'var(--green-deep)', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>
              時段
            </h4>
            <button onClick={onRowAdd} className="admin-btn-sm gold" style={{ marginLeft: 'auto' }}>+ 新增時段</button>
          </div>

          <div className="admin-table-card scroll" style={{ background: 'var(--bg-pure)' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>順序</th>
                  <th style={{ width: 150 }}>時間</th>
                  <th style={{ width: 200 }}>標題</th>
                  <th>說明</th>
                  <th style={{ width: 80 }}>標記</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {day.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button onClick={() => onRowMove(rIdx, -1)} disabled={rIdx === 0}
                          className="admin-btn-sm" style={{ padding: '2px 6px', fontSize: 11 }}>↑</button>
                        <button onClick={() => onRowMove(rIdx, 1)} disabled={rIdx === day.rows.length - 1}
                          className="admin-btn-sm" style={{ padding: '2px 6px', fontSize: 11 }}>↓</button>
                      </div>
                    </td>
                    <td>
                      <input className="form-input" style={{ padding: '6px 10px', fontSize: 13 }}
                        placeholder="08:00 — 11:00" value={row.time}
                        onChange={e => onRowChange(rIdx, { time: e.target.value })} />
                    </td>
                    <td>
                      <input className="form-input" style={{ padding: '6px 10px', fontSize: 13 }}
                        placeholder="禪坐" value={row.title}
                        onChange={e => onRowChange(rIdx, { title: e.target.value })} />
                    </td>
                    <td>
                      <input className="form-input" style={{ padding: '6px 10px', fontSize: 13 }}
                        placeholder="（選填）說明文字" value={row.desc}
                        onChange={e => onRowChange(rIdx, { desc: e.target.value })} />
                    </td>
                    <td>
                      <select className="form-select" style={{ padding: '6px 10px', fontSize: 13 }}
                        value={row.badge || ''}
                        onChange={e => onRowChange(rIdx, { badge: e.target.value })}>
                        <option value="">—</option>
                        <option value="gold">重點</option>
                      </select>
                    </td>
                    <td>
                      <button onClick={() => onRowRemove(rIdx)} className="admin-btn-sm danger"
                        style={{ padding: '4px 8px', fontSize: 11 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
