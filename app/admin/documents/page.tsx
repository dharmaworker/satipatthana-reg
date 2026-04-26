'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const DOC_COLS: { key: string; label: string }[] = [
  { key: 'photo_url', label: '個人相片' },
  { key: 'id_front_url', label: '身分證正面' },
  { key: 'id_back_url', label: '身分證反面' },
  { key: 'passport_url', label: '護照' },
  { key: 'arc_url', label: 'ARC／居留證' },
  { key: 'arrival_ticket_url', label: '來台機票' },
  { key: 'departure_ticket_url', label: '離台機票' },
  { key: 'test_0817_url', label: '8/17 快篩' },
  { key: 'test_0819_url', label: '8/19 快篩' },
]

export default function DocumentsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [missingOnly, setMissingOnly] = useState(false)
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/lodgings')
    if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return }
    const data = await res.json()
    setRows(data.data || [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const requiredDocs = (r: any): { uploaded: number; total: number } => {
    const hasId = !!(r.id_front_url && r.id_back_url)
    const hasPassport = !!r.passport_url
    const hasArc = !!r.arc_url
    let total = 2
    let uploaded = 0
    if (r.photo_url) uploaded += 1
    if (hasId || hasPassport || hasArc) uploaded += 1
    if (hasPassport) {
      total += 2
      if (r.arrival_ticket_url) uploaded += 1
      if (r.departure_ticket_url) uploaded += 1
    }
    return { uploaded, total }
  }

  const filtered = rows.filter(r => {
    const reg = r.registration || {}
    if (search) {
      const q = search.toLowerCase()
      const match =
        (reg.chinese_name || '').toLowerCase().includes(q) ||
        (reg.passport_name || '').toLowerCase().includes(q) ||
        (reg.member_id || '').toLowerCase().includes(q) ||
        (reg.student_id || '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (missingOnly) {
      const { uploaded, total } = requiredDocs(r)
      if (uploaded >= total) return false
    }
    return true
  })

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main">
        <div className="admin-toolbar">
          <input type="text"
            placeholder="搜尋姓名 / 英文姓名 / 序號 / 學號"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }} />
          <label>
            <input type="checkbox" checked={missingOnly}
              onChange={e => setMissingOnly(e.target.checked)} />
            只顯示未繳齊
          </label>
          <button onClick={fetchData} className="admin-btn-sm">重新整理</button>
          <span className="count">共 {filtered.length} 筆</span>
        </div>

        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>序號</th>
                <th>學號</th>
                <th>居住地</th>
                {DOC_COLS.map(c => <th key={c.key} style={{ textAlign: 'center' }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4 + DOC_COLS.length} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4 + DOC_COLS.length} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
              ) : filtered.map(r => {
                const reg = r.registration || {}
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {reg.chinese_name}
                      {reg.passport_name && (
                        <div className="muted">{reg.passport_name}</div>
                      )}
                    </td>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{reg.member_id || '—'}</td>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{reg.student_id || '—'}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{reg.residence || '—'}</td>
                    {DOC_COLS.map(c => {
                      const url: string = r[c.key] || ''
                      return (
                        <td key={c.key} style={{ textAlign: 'center', padding: '8px 6px' }}>
                          {url ? (
                            <DocCell url={url} label={c.label}
                              onOpen={() => setPreview({ url, title: `${reg.chinese_name}　${c.label}` })} />
                          ) : (
                            <span style={{ color: 'var(--ink-mute)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <div onClick={() => setPreview(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card lg">
            <h3>
              <span>{preview.title}</span>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <a href={preview.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 600 }}>開新視窗</a>
                <button onClick={() => setPreview(null)} className="admin-btn-sm">✕</button>
              </span>
            </h3>
            {preview.url.toLowerCase().endsWith('.pdf') ? (
              <iframe src={preview.url} style={{ width: '100%', height: '70vh', border: '1px solid var(--line)', borderRadius: 8 }} />
            ) : (
              <img src={preview.url} alt={preview.title}
                style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', margin: '0 auto', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DocCell({ url, label, onOpen }: { url: string; label: string; onOpen: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    return (
      <button onClick={onOpen} className="admin-btn-sm danger" style={{ fontSize: 11 }}>
        📄 PDF
      </button>
    )
  }
  return (
    <button onClick={onOpen} style={{ display: 'block', padding: 0, border: 'none', background: 'none', cursor: 'pointer', margin: '0 auto' }}>
      <img src={url} alt={label}
        style={{ width: 48, height: 48, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 6, display: 'block' }} />
    </button>
  )
}
