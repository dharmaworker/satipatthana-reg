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

const ARRIVAL_LABEL: Record<string, string> = {
  self: '8/19 自行',
  taipei_bus: '台北專車',
  wuri_bus: '烏日專車',
  airport_bus_0819: '機場專車',
  self_0820: '8/20 自行',
}
const DEPART_LABEL: Record<string, string> = {
  self: '自行',
  bus: '專車',
}
const BUS_DEST_LABEL: Record<string, string> = {
  taipei_824_pm: '8/24 台北',
  taipei_825_am: '8/25 台北',
  wuri_825_am: '8/25 烏日',
  taoyuan_824_pm: '8/24 桃園',
  taoyuan_825_am: '8/25 桃園',
}
const NOON_LABEL: Record<string, string> = {
  fasting_yes: '過午不食',
  fasting_no: '不過午',
  before_noon: '12前吃',
  after_noon: '12後吃',
}

export default function DocumentsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [missingOnly, setMissingOnly] = useState(false)
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)
  const [edit, setEdit] = useState<any | null>(null)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  const saveEdit = async () => {
    if (!edit) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/admin/lodgings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '儲存失敗')
      setEdit(null)
      fetchData()
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setSaving(false)
    }
  }

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

  const colSpan = 15 + DOC_COLS.length

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main">
        <div className="admin-toolbar">
          <input type="text"
            placeholder="搜尋姓名 / 英文姓名 / 報名序號 / 學號"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }} />
          <label>
            <input type="checkbox" checked={missingOnly}
              onChange={e => setMissingOnly(e.target.checked)} />
            只顯示證件未繳齊
          </label>
          <button onClick={fetchData} className="admin-btn-sm">重新整理</button>
          <span className="count">共 {filtered.length} 筆</span>
        </div>

        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>報名序號</th>
                <th>學號</th>
                <th>入住</th>
                <th>離開</th>
                <th>前往方式</th>
                <th>離開方式</th>
                <th>飲食</th>
                <th>過午</th>
                <th>茶點</th>
                <th>8/19晚餐</th>
                <th>8/24晚餐</th>
                <th>打鼾</th>
                <th style={{ whiteSpace: 'nowrap' }}>緊急聯絡人</th>
                <th>操作</th>
                {DOC_COLS.map(c => <th key={c.key} style={{ textAlign: 'center' }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colSpan} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colSpan} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
              ) : filtered.map(r => {
                const reg = r.registration || {}
                const hasLodging = !!r.arrival_date
                const departLabel = r.departure_transport === 'bus' && r.bus_destination
                  ? `專車（${BUS_DEST_LABEL[r.bus_destination] || r.bus_destination}）`
                  : DEPART_LABEL[r.departure_transport] || r.departure_transport || '—'
                return (
                  <tr key={r.id || reg.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {reg.chinese_name}
                      {reg.passport_name && <div className="muted">{reg.passport_name}</div>}
                    </td>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{reg.member_id || '—'}</td>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{reg.student_id || '—'}</td>
                    {hasLodging ? <>
                      <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.arrival_date}</td>
                      <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.departure_date || '—'}</td>
                      <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{ARRIVAL_LABEL[r.arrival_transport] || r.arrival_transport || '—'}</td>
                      <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{departLabel}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{r.diet === 'meat' ? '葷' : r.diet === 'vegetarian' ? '素' : '—'}</td>
                      <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{NOON_LABEL[r.noon_fasting] || r.noon_fasting || '—'}</td>
                      <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.snacks === 'snacks_and_drink' ? '茶點+飲' : r.snacks === 'drink_only' ? '只飲' : '—'}</td>
                      <td style={{ textAlign: 'center', fontSize: 12 }}>{r.dinner_0819 ? '✓' : '—'}</td>
                      <td style={{ textAlign: 'center', fontSize: 12 }}>{r.dinner_0824 ? '✓' : '—'}</td>
                      <td style={{ textAlign: 'center', fontSize: 12 }}>{r.snoring ? '會' : '否'}</td>
                      <td style={{ fontSize: 12 }}>
                        {r.emergency_name ? <>
                          {r.emergency_name}<br />
                          <span className="muted">{r.emergency_relation}</span><br />
                          <span className="muted">{r.emergency_phone}</span>
                        </> : '—'}
                      </td>
                    </> : (
                      <td colSpan={11} style={{ color: 'var(--ink-mute)', fontSize: 12, textAlign: 'center' }}>未填食宿登記</td>
                    )}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => { setEdit({ ...r }); setEditError('') }}
                        disabled={!hasLodging}
                        className="admin-btn-sm gold">
                        編輯
                      </button>
                    </td>
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

      {edit && (
        <div onClick={() => !saving && setEdit(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card lg">
            <h3>
              <span>編輯食宿登記：{edit.registration?.chinese_name}</span>
              <button onClick={() => !saving && setEdit(null)} className="admin-btn-sm">✕</button>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <DocSelectField label="入住日" value={edit.arrival_date} onChange={v => setEdit({ ...edit, arrival_date: v })}
                options={[['2026-08-19', '2026-08-19'], ['2026-08-20', '2026-08-20']]} />
              <DocSelectField label="離開日" value={edit.departure_date} onChange={v => setEdit({ ...edit, departure_date: v })}
                options={[['2026-08-24', '2026-08-24'], ['2026-08-25', '2026-08-25']]} />
              <DocSelectField label="前往方式" value={edit.arrival_transport} onChange={v => setEdit({ ...edit, arrival_transport: v })}
                options={[['self', '8/19 自行'], ['taipei_bus', '台北專車'], ['wuri_bus', '烏日專車'], ['airport_bus_0819', '桃園機場專車'], ['self_0820', '8/20 自行']]} />
              <DocSelectField label="離開方式" value={edit.departure_transport} onChange={v => setEdit({ ...edit, departure_transport: v })}
                options={[['self', '自行'], ['bus', '專車']]} />
              {edit.departure_transport === 'bus' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">專車目的地</label>
                  <select className="form-select" value={edit.bus_destination || ''}
                    onChange={e => setEdit({ ...edit, bus_destination: e.target.value })}>
                    <option value="">—</option>
                    <option value="taipei_824_pm">8/24 下午台北</option>
                    <option value="taipei_825_am">8/25 上午台北</option>
                    <option value="wuri_825_am">8/25 上午烏日</option>
                    <option value="taoyuan_824_pm">8/24 下午桃園機場</option>
                    <option value="taoyuan_825_am">8/25 上午桃園機場</option>
                  </select>
                </div>
              )}
              <DocSelectField label="飲食" value={edit.diet} onChange={v => setEdit({ ...edit, diet: v })}
                options={[['meat', '葷食'], ['vegetarian', '素食']]} />
              <DocSelectField label="過午不食" value={edit.noon_fasting} onChange={v => setEdit({ ...edit, noon_fasting: v })}
                options={[['fasting_yes', '過午不食'], ['fasting_no', '不過午'], ['before_noon', '12前吃'], ['after_noon', '12後吃']]} />
              <DocSelectField label="茶點" value={edit.snacks} onChange={v => setEdit({ ...edit, snacks: v })}
                options={[['snacks_and_drink', '茶點+飲'], ['drink_only', '只飲']]} />
              <DocInputField label="緊急聯絡人姓名" value={edit.emergency_name} onChange={v => setEdit({ ...edit, emergency_name: v })} />
              <DocInputField label="關係" value={edit.emergency_relation} onChange={v => setEdit({ ...edit, emergency_relation: v })} />
              <div style={{ gridColumn: 'span 2' }}>
                <DocInputField label="緊急聯絡電話" value={edit.emergency_phone} onChange={v => setEdit({ ...edit, emergency_phone: v })} />
              </div>
              <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: 'var(--ink)' }}>
                <input type="checkbox" checked={!!edit.dinner_0819}
                  onChange={e => setEdit({ ...edit, dinner_0819: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--green)' }} />
                8/19 晚餐
              </label>
              <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: 'var(--ink)' }}>
                <input type="checkbox" checked={!!edit.dinner_0824}
                  onChange={e => setEdit({ ...edit, dinner_0824: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--green)' }} />
                8/24 晚餐
              </label>
              <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: 'var(--ink)' }}>
                <input type="checkbox" checked={!!edit.snoring}
                  onChange={e => setEdit({ ...edit, snoring: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--green)' }} />
                打鼾
              </label>
            </div>

            {editError && (
              <div style={{ marginTop: 12, background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 8, padding: 10, color: 'var(--error)', fontSize: 13 }}>
                {editError}
              </div>
            )}

            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => !saving && setEdit(null)} className="admin-btn-sm">取消</button>
              <button onClick={saveEdit} disabled={saving} className="admin-btn-sm primary">
                {saving ? '儲存中⋯' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

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

function DocInputField({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input className="form-input" value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function DocSelectField({ label, value, onChange, options }: {
  label: string; value: any; onChange: (v: string) => void; options: [string, string][]
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <select className="form-select" value={value || ''} onChange={e => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
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
