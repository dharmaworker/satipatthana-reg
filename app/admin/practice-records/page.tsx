'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

type ScheduleItem = {
  id: string
  sort_order: number
  session_date: string
  time_label: string
  title: string
  is_live: boolean
}

type Row = {
  registration_id: string
  chinese_name: string
  member_id: string | null
  student_id: string | null
  checked_count: number
  checked_item_ids: string[]
}

function shortDate(date: string) {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function PracticeRecordsPage() {
  const router = useRouter()
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [formatFilter, setFormatFilter] = useState('in_person')
  const [search, setSearch] = useState('')

  const fetchData = async (fmt?: string) => {
    setLoading(true)
    const f = fmt ?? formatFilter
    const res = await fetch(`/api/admin/practice/checkins?format=${f}`)
    if (res.status === 401) { router.push('/admin'); return }
    const data = await res.json()
    setItems(data.items || [])
    setRows(data.rows || [])
    setLoading(false)
  }

  useEffect(() => {
    const saved = localStorage.getItem('admin_format')
    const initial = (saved === 'in_person' || saved === 'online') ? saved : 'in_person'
    setFormatFilter(initial)
    fetchData(initial)
    const handler = (e: Event) => {
      const f = (e as CustomEvent<string>).detail
      setFormatFilter(f)
      fetchData(f)
    }
    window.addEventListener('admin-format-change', handler)
    return () => window.removeEventListener('admin-format-change', handler)
  }, [])

  const filtered = rows.filter(r => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return r.chinese_name.toLowerCase().includes(q)
      || (r.member_id || '').toLowerCase().includes(q)
      || (r.student_id || '').toLowerCase().includes(q)
  })

  const totalItems = items.length
  const fullCount = filtered.filter(r => r.checked_count === totalItems).length

  const thStyle: React.CSSProperties = {
    padding: '10px 10px', fontWeight: 700, fontSize: 12.5,
    color: 'var(--ink)', textAlign: 'center', whiteSpace: 'nowrap',
    borderBottom: '2px solid var(--line-strong)', background: 'rgba(73,85,52,0.07)',
    position: 'sticky', top: 0, zIndex: 1,
  }
  const tdStyle: React.CSSProperties = {
    padding: '9px 10px', fontSize: 13.5, borderBottom: '1px solid var(--line)',
    textAlign: 'center', verticalAlign: 'middle',
  }

  return (
    <>
      <AdminHeader />
      <main className="container" style={{ maxWidth: 1200, paddingTop: 28, paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>共修打卡記錄</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 4 }}>
              {formatFilter === 'online' ? '線上' : '實體'} 學員 · 共 {filtered.length} 人 · 全勤 {fullCount} 人
            </p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋姓名 / 序號 / 學號"
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--line-strong)',
              fontSize: 13.5, background: 'var(--bg-pure)', color: 'var(--ink)',
              minWidth: 220, fontFamily: 'inherit',
            }}
          />
        </div>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><div className="spinner-large" /></div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--line-strong)', background: 'var(--bg-pure)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 16, width: 40 }}>#</th>
                  <th style={{ ...thStyle, textAlign: 'left', width: 90 }}>序號</th>
                  <th style={{ ...thStyle, textAlign: 'left', width: 90 }}>學號</th>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 80 }}>姓名</th>
                  {items.map(item => (
                    <th key={item.id} style={{ ...thStyle, width: 52, fontSize: 11.5 }}>
                      <div style={{ color: 'var(--ink-mute)' }}>{shortDate(item.session_date)}</div>
                      <div style={{ color: item.is_live ? 'var(--green)' : 'var(--ink)', fontWeight: 600, marginTop: 1 }}>
                        {item.is_live ? '直播' : item.title.replace(/《|》/g, '').slice(0, 4)}
                      </div>
                    </th>
                  ))}
                  <th style={{ ...thStyle, width: 60 }}>打卡數</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4 + items.length + 1} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>
                    {search ? '無符合結果' : '尚無資料'}
                  </td></tr>
                )}
                {filtered.map((row, idx) => {
                  const allDone = row.checked_count === totalItems && totalItems > 0
                  return (
                    <tr key={row.registration_id}
                      style={{ background: allDone ? 'rgba(73,85,52,0.04)' : undefined }}>
                      <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: 16, color: 'var(--ink-mute)', fontSize: 12.5 }}>{idx + 1}</td>
                      <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'var(--font-cormorant)', fontSize: 14, color: 'var(--ink-mute)' }}>
                        {row.member_id || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'var(--font-cormorant)', fontSize: 14, color: 'var(--ink-mute)' }}>
                        {row.student_id || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, color: 'var(--ink)' }}>
                        {row.chinese_name}
                      </td>
                      {items.map(item => {
                        const checked = row.checked_item_ids.includes(item.id)
                        return (
                          <td key={item.id} style={tdStyle}>
                            {checked
                              ? <span style={{ color: 'var(--green)', fontSize: 16, fontWeight: 700 }}>✓</span>
                              : <span style={{ color: 'var(--line-strong)', fontSize: 14 }}>—</span>}
                          </td>
                        )
                      })}
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px', borderRadius: 999, fontSize: 13,
                          fontWeight: 700,
                          background: allDone ? 'var(--green)' : row.checked_count > 0 ? 'rgba(73,85,52,0.1)' : 'transparent',
                          color: allDone ? '#f8f2e8' : row.checked_count > 0 ? 'var(--green-deep)' : 'var(--ink-mute)',
                        }}>
                          {row.checked_count}/{totalItems}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
