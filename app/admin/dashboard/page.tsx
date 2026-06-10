'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const RESIDENCE_OPTIONS = ['台灣','中國大陸/內地','香港','澳門','馬來西亞','泰國','日本','美國','加拿大','新加坡','英國','斯里蘭卡','其他地區']
const PLAN_OPTIONS: [string, string][] = [
  ['A1', 'A(1) 8/20-8/24 食宿等費用（匯款）'],
  ['A2', 'A(2) 8/20-8/24 食宿等費用（刷卡）'],
  ['B1', 'B(1) 8/19-8/24 食宿費用（匯款）'],
  ['B2', 'B(2) 8/19-8/24 食宿費用（刷卡）'],
  ['C1', 'C(1) 8/19 — 8/25 食宿等費用（匯款）'],
  ['C2', 'C(2) 8/19 — 8/25 食宿等費用（刷卡）'],
  ['D1', 'D(1) 8/20-8/25 食宿等費用（匯款）'],
  ['D2', 'D(2) 8/20-8/25 食宿等費用（刷卡）'],
  ['T1', '【測試】匯款 1 元'],
  ['T2', '【測試】刷卡 30 元'],
]

const PLAN_LABEL: Record<string, string> = Object.fromEntries(PLAN_OPTIONS)

const PAGE_SIZE = 50

export default function DashboardPage() {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('in_person')
  const formatRef = useRef('in_person')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [qrPreview, setQrPreview] = useState<{ url: string; title: string } | null>(null)
  const [detailReg, setDetailReg] = useState<any | null>(null)
  const [editReg, setEditReg] = useState<any | null>(null)

  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editUploading, setEditUploading] = useState<'line' | 'wechat' | null>(null)
  const [resendingConfirm, setResendingConfirm] = useState(false)
  const [resendConfirmMsg, setResendConfirmMsg] = useState('')

  const handleEditQrUpload = async (kind: 'line' | 'wechat', file: File) => {
    setEditUploading(kind)
    setEditError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/upload-qr', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      setEditReg((prev: any) => ({
        ...prev,
        [kind === 'line' ? 'line_qr_url' : 'wechat_qr_url']: data.url,
      }))
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setEditUploading(null)
    }
  }

  const saveEdit = async () => {
    if (!editReg) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editReg.id,
          chinese_name: editReg.chinese_name,
          email: editReg.email,
          phone: editReg.phone,
          residence: editReg.residence,
          member_id: editReg.member_id || null,
          line_qr_url: editReg.line_qr_url ?? null,
          wechat_qr_url: editReg.wechat_qr_url ?? null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '儲存失敗')
      setEditReg(null)
      fetchData()
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setEditSaving(false)
    }
  }

  const fetchData = async (fmt?: string) => {
    const f = fmt ?? formatRef.current
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (f !== 'all') params.set('format', f)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/registrations?${params}`)
    const data = await res.json()
    if (res.status === 401) { router.push('/admin'); return }
    setRegistrations(data.data || [])
    setPage(1)
    setLoading(false)
  }

  useEffect(() => {
    const saved = localStorage.getItem('admin_format')
    const initial = (saved === 'in_person' || saved === 'online') ? saved : 'in_person'
    formatRef.current = initial
    setFormatFilter(initial)
    fetchData(initial)
    const handler = (e: Event) => {
      const f = (e as CustomEvent<string>).detail
      formatRef.current = f
      setFormatFilter(f)
      fetchData(f)
    }
    window.addEventListener('admin-format-change', handler)
    return () => window.removeEventListener('admin-format-change', handler)
  }, [])

  useEffect(() => { fetchData() }, [statusFilter])

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchData()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const selectAll = () => {
    setSelected(selected.length === registrations.length ? [] : registrations.map(r => r.id))
  }

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage(`錄取狀態更新失敗：${data.error || res.status}`)
      return
    }
    setMessage('')
    fetchData()
  }

  const batchAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selected.length === 0) { setMessage('請先勾選項目'); return }
    const verb = action === 'approve' ? '錄取' : action === 'reject' ? '拒絕' : '刪除'
    const destructive = action === 'delete'
    if (!confirm(`確定要批次${verb} ${selected.length} 筆嗎？` + (destructive ? '\n\n此操作無法復原，會連同 QR 圖檔一併清除。' : ''))) return

    setSending(true)
    const res = await fetch('/api/admin/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selected, action }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(`批次${verb}失敗：${data.error || res.status}`)
    } else {
      const emailed = data.emailed ? `（自動寄出 ${data.emailed.ok} 封錄取信，${data.emailed.failed} 封失敗）` : ''
      setMessage(`已批次${verb} ${data.count} 筆${emailed}`)
      setSelected([])
      fetchData()
    }
    setSending(false)
  }

  const deleteRegistration = async (reg: any) => {
    if (!confirm(`確定要刪除這筆報名嗎？\n\n姓名：${reg.chinese_name}\nEmail：${reg.email}\n專屬碼：${reg.random_code}\n\n此操作無法復原，包含 QR 圖檔也會一併刪除。`)) return
    const res = await fetch('/api/admin/registrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reg.id }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage(`刪除失敗：${data.error || res.status}`)
      return
    }
    setMessage(`已刪除 ${reg.chinese_name}`)
    fetchData()
  }

  const totalCount = registrations.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const pagedRows = registrations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    waitlist: registrations.filter(r => r.status === 'waitlist').length,
    paid: registrations.filter(r => r.payment_status === 'verified').length,
  }

  const STAT_CARDS = [
    { label: '總報名', value: stats.total, accent: 'var(--ink-mute)' },
    { label: '審核中', value: stats.pending, accent: 'var(--warning)' },
    { label: '已錄取', value: stats.approved, accent: 'var(--success)' },
    { label: '候補', value: stats.waitlist, accent: '#2a6fa8' },
    { label: '未錄取', value: stats.rejected, accent: 'var(--error)' },
  ]

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main">
        {/* 統計卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
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

        {/* 操作說明 */}
        <details open className="admin-info-strip" style={{ background: 'rgba(73, 85, 52, 0.05)', borderLeftColor: 'var(--green)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--green-deep)', fontSize: 13.5, userSelect: 'none' }}>💡 操作說明（點擊可折疊）</summary>
          <ol style={{ paddingLeft: 22, marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.85 }}>
            <li><strong>審核報名：</strong>在「審核狀態」下拉切換，或勾選多筆後按上方「批次錄取／批次拒絕」。</li>
            <li><strong>報名序號自動化：</strong>錄取時系統自動編報名序號（T-001、T-002…）；取消錄取會自動註銷。不需手動。</li>
            <li><strong>編輯資料：</strong>單筆按「編輯」修改姓名／Email／居住地等；⋯ 可刪除。</li>
            <li><strong>批次寄信 / 繳費狀態 / 學號（R-xxx）管理：</strong>都請到「錄取學員」分頁操作。</li>
          </ol>
        </details>

        {/* 操作列 */}
        <div className="admin-toolbar">
          <input type="text"
            placeholder="搜尋姓名、Email、專屬碼⋯"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            style={{ width: 240 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">全部狀態</option>
            <option value="pending">審核中</option>
            <option value="approved">已錄取</option>
            <option value="waitlist">候補</option>
            <option value="rejected">未錄取</option>
          </select>
          <button onClick={() => fetchData()} className="admin-btn-sm">重新整理</button>
          {/* <button onClick={() => window.open('/api/admin/export', '_blank')} className="admin-btn-sm gold">匯出 CSV</button> */}
          <button onClick={() => batchAction('approve')} disabled={sending || selected.length === 0}
            className="admin-btn-sm primary">批次錄取（{selected.length}）</button>
          <button onClick={() => batchAction('reject')} disabled={sending || selected.length === 0}
            className="admin-btn-sm">批次拒絕（{selected.length}）</button>
          <button onClick={() => batchAction('delete')} disabled={sending || selected.length === 0}
            className="admin-btn-sm danger">批次刪除（{selected.length}）</button>
          <button disabled={resendingConfirm || selected.length === 0}
            onClick={async () => {
              if (!confirm(`確定補寄報名確認信給選取的 ${selected.length} 人？`)) return
              setResendingConfirm(true); setResendConfirmMsg('')
              let ok = 0; let fail = 0
              for (const id of selected) {
                const res = await fetch('/api/admin/resend-confirm', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id }),
                })
                if (res.ok) ok++; else fail++
              }
              setResendingConfirm(false)
              setResendConfirmMsg(fail === 0 ? `✓ 已補寄 ${ok} 封` : `✓ ${ok} 封成功，✗ ${fail} 封失敗`)
            }}
            className="admin-btn-sm">
            {resendingConfirm ? '寄送中…' : `↩ 補寄確認信（${selected.length}）`}
          </button>
          {(message || resendConfirmMsg) && (
            <span style={{ fontSize: 13, color: 'var(--green-deep)', fontWeight: 600 }}>{message || resendConfirmMsg}</span>
          )}
        </div>

        {/* 資料表格 */}
        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox"
                    checked={selected.length === registrations.length && registrations.length > 0}
                    onChange={selectAll} />
                </th>
                <th>報名時間</th>
                <th>姓名</th>
                <th>Email</th>
                <th>居住地</th>
                <th>專屬碼</th>
                <th>審核狀態</th>
                <th>報名序號</th>
                <th>身份</th>
                <th>QR</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : registrations.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
              ) : pagedRows.map((reg) => (
                <tr key={reg.id}>
                  <td>
                    <input type="checkbox"
                      checked={selected.includes(reg.id)}
                      onChange={() => toggleSelect(reg.id)} />
                  </td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{new Date(reg.created_at).toLocaleDateString('zh-TW')}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {reg.chinese_name}
                    {reg.registration_phase === 'late' && (
                      <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(180,147,88,0.18)', color: 'var(--gold-deep)', letterSpacing: '0.05em', verticalAlign: 'middle' }}>補</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{reg.email}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{reg.residence}</td>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{reg.random_code}</td>
                  <td>
                    <select value={reg.status}
                      onChange={e => updateStatus(reg.id, e.target.value)}
                      className={`admin-status-badge ${reg.status === 'pending' ? 'warn' : reg.status === 'approved' ? 'ok' : reg.status === 'waitlist' ? 'info' : 'error'}`}
                      style={{ cursor: 'pointer', appearance: 'none', paddingRight: 10, fontFamily: 'inherit' }}>
                      <option value="pending">審核中</option>
                      <option value="approved">已錄取</option>
                      <option value="waitlist">候補</option>
                      <option value="rejected">未錄取</option>
                    </select>
                  </td>
                  <td className="mono">{reg.member_id || '—'}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                    {reg.identity === 'lay' ? '在家' : reg.identity === 'monastic' ? '出家' : '—'}
                  </td>
                  <td>
                    {(() => {
                      const qrUrl = reg.line_qr_url || reg.wechat_qr_url
                      const qrLabel = reg.line_qr_url ? 'LINE' : reg.wechat_qr_url ? 'WeChat' : null
                      if (!qrUrl) return <span style={{ color: 'var(--ink-mute)' }}>—</span>
                      return (
                        <button onClick={() => setQrPreview({ url: qrUrl, title: `${reg.chinese_name} - ${qrLabel} QR` })}
                          title="點擊放大"
                          style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                          <img src={qrUrl} alt={qrLabel || 'QR'}
                            style={{ width: 44, height: 44, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 6, display: 'block' }} />
                        </button>
                      )
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setDetailReg(reg)} className="admin-btn-sm">詳細</button>
                      <button onClick={() => { setEditReg({ ...reg }); setEditError('') }} className="admin-btn-sm gold">編輯</button>
                      <button onClick={() => deleteRegistration(reg)}
                        className="admin-btn-sm"
                        style={{ color: 'var(--error)', borderColor: 'rgba(184,82,58,0.4)' }}>
                        🗑
                      </button>
                    </div>
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

      {/* Edit Modal */}
      {editReg && (
        <div onClick={() => !editSaving && setEditReg(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card" style={{ maxWidth: 520 }}>
            <h3>
              <span>編輯報名：{editReg.chinese_name}</span>
              <button onClick={() => !editSaving && setEditReg(null)} className="admin-btn-sm">✕</button>
            </h3>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="form-label">姓名 <span className="required">*</span></label>
                <input className="form-input" value={editReg.chinese_name || ''}
                  onChange={e => setEditReg({ ...editReg, chinese_name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Email <span className="required">*</span></label>
                <input type="email" className="form-input" value={editReg.email || ''}
                  onChange={e => setEditReg({ ...editReg, email: e.target.value })} />
              </div>
              <div>
                <label className="form-label">手機號碼</label>
                <input className="form-input" value={editReg.phone || ''}
                  onChange={e => setEditReg({ ...editReg, phone: e.target.value })} />
              </div>
              <div>
                <label className="form-label">居住地</label>
                <select className="form-select" value={editReg.residence || ''}
                  onChange={e => setEditReg({ ...editReg, residence: e.target.value })}>
                  <option value="">請選擇</option>
                  {RESIDENCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">報名序號</label>
                <input className="form-input uppercase" placeholder="例：T-001"
                  value={editReg.member_id || ''}
                  onChange={e => setEditReg({ ...editReg, member_id: e.target.value })} />
              </div>

              <QrEditField label="LINE QR" kind="line"
                url={editReg.line_qr_url} uploading={editUploading === 'line'}
                onUpload={f => handleEditQrUpload('line', f)}
                onClear={() => setEditReg({ ...editReg, line_qr_url: null })} />
              <QrEditField label="WeChat QR" kind="wechat"
                url={editReg.wechat_qr_url} uploading={editUploading === 'wechat'}
                onUpload={f => handleEditQrUpload('wechat', f)}
                onClear={() => setEditReg({ ...editReg, wechat_qr_url: null })} />

              {editError && (
                <div style={{ background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 8, padding: 10, color: 'var(--error)', fontSize: 13 }}>
                  {editError}
                </div>
              )}
            </div>

            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => !editSaving && setEditReg(null)} disabled={editSaving} className="admin-btn-sm">取消</button>
              <button onClick={saveEdit} disabled={editSaving || !!editUploading} className="admin-btn-sm primary">
                {editSaving ? '儲存中⋯' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailReg && (
        <div onClick={() => setDetailReg(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card lg">
            <h3>
              <span>{detailReg.chinese_name}　學員詳細資料</span>
              <button onClick={() => setDetailReg(null)} className="admin-btn-sm">✕</button>
            </h3>

            <DetailSection title="基本資料">
              <DetailField label="中文姓名" value={detailReg.chinese_name} />
              <DetailField label="身分證／護照號碼" value={detailReg.id_number} />
              <DetailField label="護照英文姓名" value={detailReg.passport_name} />
              <DetailField label="專屬碼" value={detailReg.random_code} mono />
              <DetailField label="報名序號" value={detailReg.member_id} />
              <DetailField label="身分" value={detailReg.identity === 'lay' ? '在家人' : detailReg.identity === 'monastic' ? '僧眾' : detailReg.identity} />
              <DetailField label="法名" value={detailReg.dharma_name} />
              <DetailField label="性別" value={detailReg.gender === 'male' ? '男' : detailReg.gender === 'female' ? '女' : detailReg.gender} />
              <DetailField label="年齡" value={detailReg.age} />
              <DetailField label="居住地" value={detailReg.residence} />
              <DetailField label="護照頒發地" value={detailReg.passport_country} />
              <DetailField label="手機" value={detailReg.phone} />
              <DetailField label="登入密碼" value={detailReg.member_password ?? `（手機末4碼：${detailReg.phone?.slice(-4) || '未設定'}）`} mono />
              <DetailField label="Email" value={detailReg.email} />
              <DetailField label="報名時間" value={detailReg.created_at ? new Date(detailReg.created_at).toLocaleString('zh-TW') : '—'} />
            </DetailSection>

            <DetailSection title="通訊軟體">
              <DetailField label="LINE ID" value={detailReg.line_id} />
              <DetailField label="WeChat ID" value={detailReg.wechat_id} />
            </DetailSection>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              {detailReg.line_qr_url && (
                <button onClick={() => setQrPreview({ url: detailReg.line_qr_url, title: `${detailReg.chinese_name} - LINE QR` })}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                  <img src={detailReg.line_qr_url} alt="LINE QR" style={{ width: 80, height: 80, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 8 }} />
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, textAlign: 'center' }}>LINE</p>
                </button>
              )}
              {detailReg.wechat_qr_url && (
                <button onClick={() => setQrPreview({ url: detailReg.wechat_qr_url, title: `${detailReg.chinese_name} - WeChat QR` })}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                  <img src={detailReg.wechat_qr_url} alt="WeChat QR" style={{ width: 80, height: 80, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 8 }} />
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, textAlign: 'center' }}>WeChat</p>
                </button>
              )}
            </div>

            <DetailSection title="報名條件">
              <DetailField label="承諾如實填寫" value={yn(detailReg.honest_confirm)} />
              <DetailField label="正式學員經驗" value={yn(detailReg.attended_formal)} />
              <DetailField label="觀看 3 屆錄影" value={yn(detailReg.watched_recordings)} />
              <DetailField label="ZOOM 一對一指導" value={yn(detailReg.zoom_guidance)} />
              <DetailField label="法談 30 篇以上" value={detailReg.watched_30_talks === 'yes' ? '是' : detailReg.watched_30_talks === 'commit' ? '承諾於 8/16 前聽完' : detailReg.watched_30_talks === 'no' ? '否' : '—'} />
              <DetailField label="持守五戒" value={yn(detailReg.keep_precepts)} />
              <DetailField label="同意繳費" value={yn(detailReg.pay_confirm)} />
              <DetailField label="身體健康" value={yn(detailReg.health_confirm)} />
              <DetailField label="修習年資" value={detailReg.practice_years} />
              <DetailField label="練習頻率" value={detailReg.practice_frequency} />
            </DetailSection>
            {detailReg.mental_health_note && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>心理健康備註</div>
                <div style={{ background: 'var(--bg-pure)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 4, fontSize: 13, color: 'var(--ink)' }}>
                  {detailReg.mental_health_note}
                </div>
              </div>
            )}

            {Array.isArray(detailReg.attended_courses) && detailReg.attended_courses.length > 0 && (
              <>
                <h4 style={detailH4Style}>過往參加課程</h4>
                <ul style={{ paddingLeft: 22, fontSize: 13, color: 'var(--ink-soft)' }}>
                  {detailReg.attended_courses.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </>
            )}

            <DetailSection title="狀態 / 繳費">
              <DetailField label="審核狀態" value={({ pending: '審核中', approved: '已錄取', waitlist: '候補', rejected: '未錄取' } as Record<string, string>)[detailReg.status] || detailReg.status} />
              <DetailField label="繳費狀態" value={({ unpaid: '未繳費', paid: '已回報待確認', verified: '已確認繳費' } as Record<string, string>)[detailReg.payment_status] || detailReg.payment_status} />
              <DetailField label="繳費方案" value={detailReg.payment_plan} />
              <DetailField label="繳費確認時間" value={detailReg.payment_confirmed_at ? new Date(detailReg.payment_confirmed_at).toLocaleString('zh-TW') : '—'} />
            </DetailSection>
            {detailReg.payment_note && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>繳費備註</div>
                <div style={{ background: 'var(--bg-pure)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 4, fontSize: 12, color: 'var(--ink)', wordBreak: 'break-all' }}>
                  {detailReg.payment_note}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {qrPreview && (
        <div onClick={() => setQrPreview(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card" style={{ maxWidth: 460 }}>
            <h3>
              <span>{qrPreview.title}</span>
              <button onClick={() => setQrPreview(null)} className="admin-btn-sm">✕</button>
            </h3>
            <img src={qrPreview.url} alt="QR" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />
            <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href={qrPreview.url} target="_blank" rel="noreferrer" className="admin-btn-sm">新分頁開啟</a>
              <a href={qrPreview.url} download className="admin-btn-sm primary">下載</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const detailH4Style: React.CSSProperties = {
  fontFamily: 'var(--font-noto-serif-tc), serif',
  fontSize: 14, fontWeight: 700,
  color: 'var(--green-deep)', letterSpacing: '0.08em',
  marginTop: 18, marginBottom: 8,
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h4 style={detailH4Style}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13.5 }}>
        {children}
      </div>
    </>
  )
}

function DetailField({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ color: 'var(--ink)', marginTop: 2, fontFamily: mono ? 'var(--font-cormorant), monospace' : undefined }}>
        {value || value === 0 ? value : '—'}
      </div>
    </div>
  )
}

function yn(v: boolean | null | undefined) {
  if (v === true) return '是'
  if (v === false) return '否'
  return '—'
}

function QrEditField({ label, kind, url, uploading, onUpload, onClear }: {
  label: string; kind: 'line' | 'wechat'
  url: string | null
  uploading: boolean
  onUpload: (f: File) => void
  onClear: () => void
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {url && (
        <img src={url} alt={label}
          style={{ width: 96, height: 96, objectFit: 'contain', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8 }} />
      )}
      <input type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
        style={{ fontSize: 12.5 }} />
      {uploading && <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 4 }}>上傳中⋯</p>}
      {url && (
        <button onClick={onClear}
          style={{ marginTop: 6, fontSize: 12, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
          清除
        </button>
      )}
    </div>
  )
}
