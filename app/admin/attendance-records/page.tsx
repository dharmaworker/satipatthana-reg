'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const STATUS_LABEL: Record<string, string> = {
  full: '已全程完整參課',
  partial: '基本完整參與，缺勤不超過3次',
  absent: '缺勤超過3次以上',
}

const STATUS_COLOR: Record<string, string> = {
  full: 'var(--success)',
  partial: 'var(--warning)',
  absent: 'var(--error)',
}

type Row = {
  registration_id: string
  chinese_name: string
  member_id: string | null
  student_id: string | null
  email: string
  phone: string | null
  attendance_status: string | null
  submitted_at: string | null
}

const PAGE_SIZE = 50

export default function AttendanceRecordsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/attendance-records')
    if (res.status === 401) { router.push('/admin'); return }
    const data = await res.json()
    setRows(data.rows || [])
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

  const filtered = rows.filter(r => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return r.chinese_name.toLowerCase().includes(q)
      || (r.member_id || '').toLowerCase().includes(q)
      || (r.student_id || '').toLowerCase().includes(q)
      || (r.email || '').toLowerCase().includes(q)
  })

  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const submitted = filtered.filter(r => r.attendance_status)
  const notSubmitted = filtered.filter(r => !r.attendance_status)
  const fullCount = filtered.filter(r => r.attendance_status === 'full').length
  const partialCount = filtered.filter(r => r.attendance_status === 'partial').length
  const absentCount = filtered.filter(r => r.attendance_status === 'absent').length

  const STAT_CARDS = [
    { label: '總錄取（線上）', value: filtered.length, accent: 'var(--ink-mute)' },
    { label: '已簽到', value: submitted.length, accent: 'var(--green)' },
    { label: '未簽到', value: notSubmitted.length, accent: 'var(--warning)' },
    { label: '全程完整', value: fullCount, accent: 'var(--success)' },
    { label: '缺勤超3次', value: absentCount, accent: 'var(--error)' },
  ]

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', fontWeight: 700, fontSize: 12.5,
    color: 'var(--ink)', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '2px solid var(--line-strong)', background: 'rgba(73,85,52,0.07)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '9px 12px', fontSize: 13.5, borderBottom: '1px solid var(--line)',
    color: 'var(--ink)',
  }

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main">
        {/* 統計卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 18 }}>
          {STAT_CARDS.map(({ label, value, accent }) => (
            <div key={label} style={{
              background: 'rgba(251, 248, 242, 0.92)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '20px 18px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              borderTop: `3px solid ${accent}`,
            }}>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 36, fontWeight: 700, color: accent, lineHeight: 1, letterSpacing: '0.04em' }}>
                {value}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 8, fontWeight: 600, letterSpacing: '0.08em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="admin-toolbar">
          <input type="text"
            placeholder="搜尋姓名 / 序號 / 學號 / Email"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }} />
          <button onClick={() => fetchData()} className="admin-btn-sm">重新整理</button>
          <span className="count">共 {filtered.length} 筆（已簽到 {submitted.length}）</span>
        </div>

        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={thStyle}>姓名</th>
                <th style={thStyle}>報名序號</th>
                <th style={thStyle}>學號</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>手機</th>
                <th style={thStyle}>參課情況</th>
                <th style={thStyle}>簽到時間</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
              ) : pagedRows.map(r => (
                <tr key={r.registration_id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.chinese_name}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--ink-mute)' }}>{r.member_id || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--ink-mute)' }}>{r.student_id || '—'}</td>
                  <td style={{ ...tdStyle, color: 'var(--ink-soft)', fontSize: 13 }}>{r.email}</td>
                  <td style={{ ...tdStyle, color: 'var(--ink-soft)', fontSize: 13 }}>{r.phone || '—'}</td>
                  <td style={tdStyle}>
                    {r.attendance_status ? (
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                        fontSize: 12.5, fontWeight: 600,
                        color: STATUS_COLOR[r.attendance_status],
                        background: STATUS_COLOR[r.attendance_status] + '18',
                        border: `1px solid ${STATUS_COLOR[r.attendance_status]}44`,
                        whiteSpace: 'nowrap',
                      }}>
                        {STATUS_LABEL[r.attendance_status] || r.attendance_status}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-mute)', fontSize: 13 }}>未簽到</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--ink-mute)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleString('zh-TW') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line)', fontSize: 13.5, color: 'var(--ink-soft)' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="admin-btn-sm">← 上一頁</button>
              <span>第 <strong style={{ color: 'var(--ink)' }}>{page}</strong> / {totalPages} 頁　共 {totalCount} 筆</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="admin-btn-sm">下一頁 →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
