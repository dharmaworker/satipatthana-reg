'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const PLAN_LABEL: Record<string, string> = {
  A1: 'A(1) 匯款', A2: 'A(2) 刷卡',
  B1: 'B(1) 匯款', B2: 'B(2) 刷卡',
  C1: 'C(1) 匯款', C2: 'C(2) 刷卡',
  D1: 'D(1) 匯款', D2: 'D(2) 刷卡',
  T1: 'T1 測試匯款', T2: 'T2 測試刷卡',
}

const DOC_LABEL: Record<string, string> = {
  photo_url: '個人照片',
  id_front_url: '身分證正面',
  id_back_url: '身分證反面',
  passport_url: '護照',
  arc_url: 'ARC／居留證',
  arrival_ticket_url: '來台機票',
  departure_ticket_url: '離台機票',
  test_0817_url: '8/17 快篩',
  test_0819_url: '8/19 快篩',
}

const PAGE_SIZE = 50

export default function LodgingsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<any | null>(null)
  const [edit, setEdit] = useState<any | null>(null)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkSending, setBulkSending] = useState<null | 'approval' | 'formal' | 'invite' | 'student_id' | 'timetable' | 'attendance' | 'group_join'>(null)
  const [bulkMessage, setBulkMessage] = useState('')
  const [onlyWithStudentId, setOnlyWithStudentId] = useState(false)
  const [onlyNotNotified, setOnlyNotNotified] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [formatFilter, setFormatFilter] = useState<string>('in_person')

  const nextStudentId = () => {
    let maxN = 0
    for (const r of rows) {
      const m = (r.registration?.student_id || '').match(/^R-(\d+)$/)
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
    }
    return `R-${String(maxN + 1).padStart(3, '0')}`
  }
  const patchStudentId = async (regId: string, student_id: string | null) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: regId, student_id }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setBulkMessage(`操作失敗：${d.error || res.status}`)
      return false
    }
    fetchData()
    return true
  }
  const clearStudentId = async (reg: any) => {
    if (!confirm(`確定註銷 ${reg.chinese_name} 的學號「${reg.student_id}」？`)) return
    if (await patchStudentId(reg.id, null)) setBulkMessage(`已註銷 ${reg.chinese_name} 的學號`)
  }

  const updatePaymentStatus = async (regId: string, payment_status: string) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: regId, payment_status }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setBulkMessage(`繳費狀態更新失敗：${d.error || res.status}`)
      return
    }
    fetchData()
  }

  const sendApprovalNotifications = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選至少一位學員'); return }
    if (!confirm(`寄出錄取通知信給 ${bulkSelected.length} 位學員？`)) return
    setBulkSending('approval')
    setBulkMessage('')
    const res = await fetch('/api/admin/send-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(null)
    if (res.ok) { setBulkSelected([]); fetchData() }
  }

  const sendInteractiveInvite = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選至少一位學員'); return }
    if (!confirm(`寄出互動報名開放通知信給 ${bulkSelected.length} 位學員？\n\n提醒：寄信前請確認後台「互動」分頁已開啟「互動報名」，否則學員點開連結將看到「尚未開放」。`)) return
    setBulkSending('invite')
    setBulkMessage('')
    const res = await fetch('/api/admin/send-interactive-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(null)
    if (res.ok) setBulkSelected([])
  }

  const sendTimetableNotification = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選至少一位學員'); return }
    if (!confirm(`寄出課表發佈通知信給 ${bulkSelected.length} 位學員？`)) return
    setBulkSending('timetable')
    setBulkMessage('')
    const res = await fetch('/api/admin/send-timetable-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(null)
    if (res.ok) setBulkSelected([])
  }

  const sendStudentIdNotification = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選至少一位學員'); return }
    const noId = rows.filter(r => bulkSelected.includes(r.registration?.id) && !r.registration?.student_id)
    if (noId.length > 0) {
      alert(`勾選中有 ${noId.length} 位尚未分配學號（${noId.map((r: any) => r.registration?.chinese_name).join('、')}），請先完成分配再寄信。`)
      return
    }
    if (!confirm(`寄出學號分配通知信給 ${bulkSelected.length} 位學員？`)) return
    setBulkSending('student_id')
    setBulkMessage('')
    const res = await fetch('/api/admin/send-student-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(null)
    if (res.ok) setBulkSelected([])
  }

  const sendAttendanceNotification = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選至少一位學員'); return }
    if (!confirm(`寄出課程打卡提醒信（最後一天）給 ${bulkSelected.length} 位學員？`)) return
    setBulkSending('attendance')
    setBulkMessage('')
    const res = await fetch('/api/admin/send-attendance-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(null)
    if (res.ok) setBulkSelected([])
  }

  const sendGroupJoin = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選至少一位學員'); return }
    if (!confirm(`寄出加入群組通知信給 ${bulkSelected.length} 位學員？\n\n系統會依報名時留下的聯絡方式（LINE / 微信）分別寄出對應的群組 QR Code。未留任何聯絡方式的學員會自動跳過。`)) return
    setBulkSending('group_join')
    setBulkMessage('')
    const res = await fetch('/api/admin/send-group-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(null)
    if (res.ok) setBulkSelected([])
  }

  const sendFormalNotifications = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選至少一位學員'); return }
    const noLodgingCount = filtered
      .filter(r => bulkSelected.includes(r.registration?.id) && !r.id)
      .length
    if (noLodgingCount > 0) {
      if (!confirm(`勾選中有 ${noLodgingCount} 位尚未填食宿登記的學員，通知信內食宿欄位會顯示「—」。確定仍要寄出？`)) return
    } else {
      if (!confirm(`寄出正式學員通知信給 ${bulkSelected.length} 位學員？`)) return
    }
    setBulkSending('formal')
    setBulkMessage('')
    const res = await fetch('/api/admin/send-formal-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(null)
    if (res.ok) setBulkSelected([])
  }

  const handleEditUpload = async (kind: string, file: File) => {
    setUploadingKind(kind)
    setEditError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/upload-lodging', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      setEdit((prev: any) => ({ ...prev, [kind + '_url']: data.url }))
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setUploadingKind(null)
    }
  }

  const saveEdit = async () => {
    if (!edit) return
    setSaving(true)
    setEditError('')
    try {
      const regId = edit.registration?.id
      const newStudentId = edit.registration?.student_id ?? null
      const oldStudentId = rows.find(r => r.registration?.id === regId)?.registration?.student_id ?? null
      if (regId && newStudentId !== oldStudentId) {
        const r1 = await fetch('/api/admin/registrations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: regId, student_id: newStudentId || null }),
        })
        if (!r1.ok) {
          const d = await r1.json().catch(() => ({}))
          throw new Error(`學號儲存失敗：${d.error || r1.status}`)
        }
      }
      if (edit.id) {
        const res = await fetch('/api/admin/lodgings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edit),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '食宿儲存失敗')
      }
      setEdit(null)
      setDetail(null)
      fetchData()
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (reg: any) => {
    if (!confirm(`確定要刪除這筆報名嗎？\n\n姓名：${reg.chinese_name}\nEmail：${reg.email}\n專屬碼：${reg.random_code}\n\n此操作無法復原，食宿登記、所有上傳檔案都會一併刪除。`)) return
    setDeleting(reg.id)
    const res = await fetch('/api/admin/registrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reg.id }),
    })
    setDeleting(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setBulkMessage(`刪除失敗：${d.error || res.status}`)
      return
    }
    setBulkMessage(`已刪除 ${reg.chinese_name}`)
    fetchData()
  }

  const fetchData = async (format?: string) => {
    setLoading(true)
    const f = format ?? formatFilter
    const res = await fetch(`/api/admin/lodgings?format=${f}`)
    if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return }
    const data = await res.json()
    setRows(data.data || [])
    setPage(1)
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
    const reg = r.registration || {}
    if (onlyWithStudentId && !reg.student_id) return false
    if (onlyNotNotified && reg.approval_email_sent_at) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (reg.chinese_name || '').toLowerCase().includes(q) ||
      (reg.email || '').toLowerCase().includes(q) ||
      (reg.random_code || '').toLowerCase().includes(q) ||
      (reg.member_id || '').toLowerCase().includes(q) ||
      (reg.student_id || '').toLowerCase().includes(q)
    )
  })

  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = {
    total: rows.length,
    withStudentId: rows.filter(r => r.registration?.student_id).length,
    lodgingFilled: rows.filter(r => r.id).length,
    payPending: rows.filter(r => r.registration?.payment_status === 'paid').length,
    paid: rows.filter(r => r.registration?.payment_status === 'verified').length,
    approvalSent: rows.filter(r => r.registration?.approval_email_sent_at).length,
  }

  const STAT_CARDS = [
    { label: '總錄取', value: stats.total, accent: 'var(--ink-mute)' },
    { label: '已寄錄取通知', value: stats.approvalSent, accent: 'var(--success)' },
    { label: '已分配學號', value: stats.withStudentId, accent: 'var(--success)' },
    { label: '食宿已填', value: stats.lodgingFilled, accent: 'var(--green)' },
    { label: '繳費待確認', value: stats.payPending, accent: 'var(--warning)' },
    { label: '已繳費', value: stats.paid, accent: 'var(--green)' },
  ]

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main">
        {/* 統計卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 18 }}>
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

        <details open className="admin-info-strip" style={{ background: 'rgba(73, 85, 52, 0.05)', borderLeftColor: 'var(--green)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--green-deep)', fontSize: 13.5, userSelect: 'none' }}>💡 操作說明（點擊可折疊）</summary>
          <ol style={{ paddingLeft: 22, marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.85 }}>
            <li><strong>本頁對象：</strong>所有狀態為「已錄取」的學員；未填食宿者食宿欄位顯示「—」。</li>
            <li><strong>報名序號 T-xxx：</strong>僅顯示，由「報名管理」錄取時自動產生；取消錄取時自動註銷。</li>
            <li><strong>學號 R-xxx：</strong>按「✏ 手動」自己 key（儲存需唯一）；按「註銷」可清除。</li>
            <li><strong>繳費狀態：</strong>下拉切換 未繳費／待確認／已確認（學員匯款後由財務人員更新）。</li>
            <li><strong>詳細／編輯：</strong>僅對已填食宿者可用；尚未填寫則不顯示。</li>
            <li><strong>批次寄信：</strong>用搜尋／「只顯示已分配學號者」過濾後勾選學員 → 按對應的批次寄信按鈕。</li>
          </ol>
        </details>

        <div className="admin-toolbar">
          <input type="text"
            placeholder="搜尋姓名 / Email / 專屬碼 / 報名序號 / 學號"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }} />
          <label style={{ background: 'rgba(216, 194, 154, 0.18)', border: '1px solid rgba(180, 147, 88, 0.3)', borderRadius: 8, padding: '6px 12px' }}>
            <input type="checkbox" checked={onlyWithStudentId}
              onChange={e => { setOnlyWithStudentId(e.target.checked); setPage(1) }} />
            只顯示已分配學號者
          </label>
          <label style={{ background: 'rgba(184, 82, 58, 0.07)', border: '1px solid rgba(184, 82, 58, 0.3)', borderRadius: 8, padding: '6px 12px' }}>
            <input type="checkbox" checked={onlyNotNotified}
              onChange={e => { setOnlyNotNotified(e.target.checked); setPage(1) }} />
            只顯示尚未寄錄取通知者
          </label>
          <button onClick={() => fetchData()} className="admin-btn-sm">重新整理</button>
          <label>
            <input type="checkbox" checked={bulkSelected.length > 0 && bulkSelected.length === filtered.length}
              onChange={() => {
                if (bulkSelected.length === filtered.length) setBulkSelected([])
                else setBulkSelected(filtered.map(r => r.registration?.id).filter(Boolean))
              }} />
            全選本頁
          </label>
          <button onClick={sendApprovalNotifications}
            disabled={bulkSending !== null}
            className="admin-btn-sm primary">
            {bulkSending === 'approval' ? '寄送中⋯' : `批次寄錄取通知（${bulkSelected.length}）`}
          </button>
          <button onClick={sendStudentIdNotification}
            disabled={bulkSending !== null}
            className="admin-btn-sm primary">
            {bulkSending === 'student_id' ? '寄送中⋯' : `批次寄學號分配通知（${bulkSelected.length}）`}
          </button>
          <button onClick={sendTimetableNotification}
            disabled={bulkSending !== null}
            className="admin-btn-sm primary">
            {bulkSending === 'timetable' ? '寄送中⋯' : `批次寄課表發佈通知（${bulkSelected.length}）`}
          </button>
          <button onClick={sendGroupJoin}
            disabled={bulkSending !== null}
            className="admin-btn-sm primary">
            {bulkSending === 'group_join' ? '寄送中⋯' : `批次寄入群通知（${bulkSelected.length}）`}
          </button>
          {/* 正式學員通知暫時隱藏
          <button onClick={sendFormalNotifications}
            disabled={bulkSending !== null}
            className="admin-btn-sm gold">
            {bulkSending === 'formal' ? '寄送中⋯' : `批次寄正式學員通知（${bulkSelected.length}）`}
          </button>
          */}
          {formatFilter !== 'online' && (
            <button onClick={sendInteractiveInvite}
              disabled={bulkSending !== null}
              className="admin-btn-sm">
              {bulkSending === 'invite' ? '寄送中⋯' : `批次寄互動報名通知（${bulkSelected.length}）`}
            </button>
          )}
          {formatFilter === 'online' && (
            <button onClick={sendAttendanceNotification}
              disabled={bulkSending !== null}
              className="admin-btn-sm primary">
              {bulkSending === 'attendance' ? '寄送中⋯' : `批次寄課程打卡提醒（${bulkSelected.length}）`}
            </button>
          )}
          {bulkMessage && (
            <span style={{ fontSize: 13, color: 'var(--green-deep)', fontWeight: 600 }}>{bulkMessage}</span>
          )}
          <span className="count">共 {filtered.length} 筆</span>
        </div>

        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox"
                    checked={bulkSelected.length > 0 && bulkSelected.length === filtered.length}
                    onChange={() => {
                      if (bulkSelected.length === filtered.length) setBulkSelected([])
                      else setBulkSelected(filtered.map(r => r.registration?.id).filter(Boolean))
                    }} />
                </th>
                <th>姓名</th>
                <th>報名序號<br /><span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-mute)' }}>{formatFilter === 'online' ? 'L-xxx 自動' : 'T-xxx 自動'}</span></th>
                <th>學號<br /><span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-mute)' }}>{formatFilter === 'online' ? 'C-xxx 自動' : 'R-xxx 手動'}</span></th>
                <th>專屬碼</th>
                <th>錄取通知</th>
                {formatFilter !== 'online' && <th>方案</th>}
                {formatFilter !== 'online' && <th>繳費</th>}
                {formatFilter !== 'online' && <th>入住—離開</th>}
                {formatFilter !== 'online' && <th>飲食</th>}
                {formatFilter !== 'online' && <th>打鼾</th>}
                {formatFilter !== 'online' && <th>緊急聯絡人</th>}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={formatFilter === 'online' ? 7 : 13} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={formatFilter === 'online' ? 7 : 13} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>{formatFilter === 'online' ? '尚無錄取學員' : '尚無食宿登記'}</td></tr>
              ) : pagedRows.map(r => {
                const reg = r.registration || {}
                return (
                  <tr key={r.id || reg.id}>
                    <td>
                      <input type="checkbox"
                        checked={bulkSelected.includes(reg.id)}
                        onChange={() => setBulkSelected(prev =>
                          prev.includes(reg.id) ? prev.filter(x => x !== reg.id) : [...prev, reg.id]
                        )} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{reg.chinese_name}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{reg.member_id || '—'}</td>
                    <td>
                      <StudentIdCell reg={reg}
                        onSave={val => patchStudentId(reg.id, val)}
                        onClear={() => clearStudentId(reg)} />
                    </td>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{reg.random_code}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {reg.approval_email_sent_at
                        ? <span style={{ color: 'var(--success)' }}>✓ {new Date(reg.approval_email_sent_at).toLocaleDateString('zh-TW')}</span>
                        : <span style={{ color: 'var(--error)' }}>未寄</span>}
                    </td>
                    {formatFilter !== 'online' && <td className="muted" style={{ whiteSpace: 'nowrap' }}>{PLAN_LABEL[reg.payment_plan] || reg.payment_plan || '—'}</td>}
                    {formatFilter !== 'online' && <td>
                      <select value={reg.payment_status || 'unpaid'}
                        onChange={e => updatePaymentStatus(reg.id, e.target.value)}
                        className={`admin-status-badge ${reg.payment_status === 'unpaid' ? 'muted' : reg.payment_status === 'paid' ? 'warn' : 'ok'}`}
                        style={{ cursor: 'pointer', appearance: 'none', paddingRight: 10, fontFamily: 'inherit' }}>
                        <option value="unpaid">未繳費</option>
                        <option value="paid">待確認</option>
                        <option value="verified">已確認</option>
                      </select>
                      {r.payment_method && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{r.payment_method === 'transfer' ? '匯款' : '刷卡'}</div>
                      )}
                      {reg.payment_note && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={reg.payment_note}>
                          {shortNote(reg.payment_note)}
                        </div>
                      )}
                    </td>}
                    {formatFilter !== 'online' && <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.arrival_date ? <>{r.arrival_date}<br />{r.departure_date}</> : <span style={{ color: 'var(--ink-mute)' }}>未填食宿</span>}
                    </td>}
                    {formatFilter !== 'online' && <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.diet ? <>{r.diet === 'meat' ? '葷' : '素'}<br />{r.noon_fasting === 'before_noon' ? '12 前' : '12 後'}</> : '—'}
                    </td>}
                    {formatFilter !== 'online' && <td className="muted" style={{ fontSize: 12 }}>{r.id ? (r.snoring ? '會' : '否') : '—'}</td>}
                    {formatFilter !== 'online' && <td style={{ fontSize: 12 }}>
                      {r.emergency_name ? <>
                        {r.emergency_name}<br />
                        <span className="muted">{r.emergency_relation}</span><br />
                        <span className="muted">{r.emergency_phone}</span>
                      </> : '—'}
                    </td>}
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button onClick={() => setDetail(r)} disabled={!r.id} className="admin-btn-sm">詳細</button>
                        <button onClick={() => { setEdit({ ...r }); setEditError('') }} className="admin-btn-sm gold">編輯</button>
                        <button onClick={() => handleDelete(reg)} disabled={deleting === reg.id}
                          className="admin-btn-sm"
                          style={{ color: 'var(--error)', borderColor: 'rgba(184,82,58,0.4)' }}>
                          {deleting === reg.id ? '刪除中⋯' : '🗑 刪除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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

      {/* Detail Modal */}
      {detail && (
        <div onClick={() => setDetail(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card lg">
            <h3>
              <span>{detail.registration?.chinese_name}（{detail.registration?.random_code}）</span>
              <button onClick={() => setDetail(null)} className="admin-btn-sm">✕</button>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13.5 }}>
              <Field label="報名序號" value={detail.registration?.member_id} />
              <Field label="學號" value={detail.registration?.student_id} />
              <Field label="身分證／護照號碼" value={detail.registration?.id_number} />
              <Field label="Email" value={detail.registration?.email} />
              <Field label="手機" value={detail.registration?.phone} />
              <Field label="居住地" value={detail.registration?.residence} />
              <Field label="方案" value={PLAN_LABEL[detail.registration?.payment_plan] || detail.registration?.payment_plan} />
              <Field label="繳費方式" value={detail.payment_method === 'transfer' ? '匯款' : '刷卡'} />
              <Field label="繳費狀態" value={({ unpaid: '未繳費', paid: '已回報待確認', verified: '已確認繳費' } as Record<string, string>)[detail.registration?.payment_status] || detail.registration?.payment_status} />
              <Field label="繳費確認時間" value={detail.registration?.payment_confirmed_at ? new Date(detail.registration.payment_confirmed_at).toLocaleString('zh-TW') : '—'} />
              {detail.registration?.payment_note && (
                <div style={{ gridColumn: 'span 2' }}>
                  <FieldLabel>繳費備註</FieldLabel>
                  <div style={{ background: 'var(--bg-pure)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 4, fontSize: 12, color: 'var(--ink)', wordBreak: 'break-all' }}>
                    {detail.registration.payment_note}
                  </div>
                </div>
              )}
              <Field label="入住日" value={detail.arrival_date} />
              <Field label="離開日" value={detail.departure_date} />
              <Field label="前往方式" value={transportLabel(detail.arrival_transport)} />
              <Field label="離開方式" value={`${detail.departure_transport === 'bus' ? '專車' : '自行'}${detail.bus_destination ? '（' + busDestLabel(detail.bus_destination) + '）' : ''}`} />
              <Field label="飲食" value={detail.diet === 'meat' ? '葷食' : '素食'} />
              <Field label="過午不食" value={detail.noon_fasting === 'before_noon' ? '12 前吃' : '12 後吃'} />
              <Field label="茶點" value={detail.snacks === 'snacks_and_drink' ? '茶點 + 咖啡/茶' : '只咖啡/茶'} />
              <Field label="8/19 晚餐" value={detail.dinner_0819 ? '是' : '否'} />
              <Field label="8/24 晚餐" value={detail.dinner_0824 ? '是' : '否'} />
              <Field label="打鼾" value={detail.snoring ? '會' : '不會'} />
              <Field label="緊急聯絡人" value={`${detail.emergency_name}（${detail.emergency_relation}）${detail.emergency_phone}`} />
            </div>

            <h4 style={detailH4Style}>報名資訊</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13.5 }}>
              <Field label="性別" value={{ m: '男', f: '女', other: '其他' }[detail.registration?.gender as string] || detail.registration?.gender} />
              <Field label="年齡" value={detail.registration?.age} />
              <Field label="身份" value={{ lay: '在家人（居士）', monastic: '僧眾' }[detail.registration?.identity as string] || detail.registration?.identity} />
              {detail.registration?.dharma_name && <Field label="法名" value={detail.registration.dharma_name} />}
              {detail.registration?.passport_name && <Field label="護照英文名" value={detail.registration.passport_name} />}
              {detail.registration?.passport_country && <Field label="護照國籍" value={detail.registration.passport_country} />}
              <Field label="參加方式" value={detail.registration?.retreat_format === 'online' ? '線上' : detail.registration?.retreat_format === 'in_person' ? '實體' : detail.registration?.retreat_format} />
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {detail.registration?.line_qr_url && (
                  <div>
                    <FieldLabel>LINE（{detail.registration.line_id}）</FieldLabel>
                    <button onClick={() => setPreview({ url: detail.registration.line_qr_url, title: `${detail.registration.chinese_name} - LINE QR` })}
                      style={{ marginTop: 4, padding: 0, border: '1px solid var(--line)', borderRadius: 8, background: 'none', cursor: 'pointer', display: 'block' }}>
                      <img src={detail.registration.line_qr_url} alt="LINE QR" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 7, display: 'block' }} />
                    </button>
                  </div>
                )}
                {detail.registration?.wechat_qr_url && (
                  <div>
                    <FieldLabel>微信（{detail.registration.wechat_id}）</FieldLabel>
                    <button onClick={() => setPreview({ url: detail.registration.wechat_qr_url, title: `${detail.registration.chinese_name} - WeChat QR` })}
                      style={{ marginTop: 4, padding: 0, border: '1px solid var(--line)', borderRadius: 8, background: 'none', cursor: 'pointer', display: 'block' }}>
                      <img src={detail.registration.wechat_qr_url} alt="WeChat QR" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 7, display: 'block' }} />
                    </button>
                  </div>
                )}
                {!detail.registration?.line_qr_url && !detail.registration?.wechat_qr_url && (
                  <Field label="通訊方式" value="—" />
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13.5, marginTop: 10 }}>
              <Field label="Q3 正式學員課程" value={detail.registration?.attended_formal ? '是' : '否'} />
              <Field label="Q10 完整觀看 3 屆錄影" value={detail.registration?.watched_recordings ? '是' : '否'} />
              <Field label="Q11 ZOOM 一對一指導" value={detail.registration?.zoom_guidance ? '是' : '否'} />
              <Field label="Q12 法談 30 篇以上" value={detail.registration?.watched_30_talks ? '是' : '否'} />
              <Field label="Q13 持守五戒" value={detail.registration?.keep_precepts ? '是' : '否'} />
              <Field label="Q14 學習實踐時間" value={detail.registration?.practice_years} />
              <div style={{ gridColumn: 'span 2' }}>
                <Field label="Q15 固定練習頻率" value={({
                  every_day: '每天做固定形式的練習至少 30 分鐘',
                  almost_every_day: '幾乎每天都做，偶有間斷（三個月不多於 5 天）',
                } as Record<string, string>)[detail.registration?.practice_frequency] || detail.registration?.practice_frequency} />
              </div>
            </div>
            {detail.registration?.attended_courses?.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13.5 }}>
                <FieldLabel>曾參加課程</FieldLabel>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: 18, color: 'var(--ink)', fontSize: 13 }}>
                  {detail.registration.attended_courses.map((c: string) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            )}
            {detail.registration?.mental_health_note && (
              <div style={{ marginTop: 10 }}>
                <FieldLabel>心理健康備註</FieldLabel>
                <div style={{ background: 'var(--bg-pure)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 4, fontSize: 12, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                  {detail.registration.mental_health_note}
                </div>
              </div>
            )}

            {(detail.flight_arrival_date || detail.flight_departure_date) && (
              <>
                <h4 style={detailH4Style}>航班資訊</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13.5 }}>
                  <Field label="抵台日期" value={detail.flight_arrival_date} />
                  <Field label="抵台時間" value={detail.flight_arrival_time} />
                  <Field label="離台日期" value={detail.flight_departure_date} />
                  <Field label="離台時間" value={detail.flight_departure_time} />
                </div>
              </>
            )}

            <h4 style={detailH4Style}>已上傳檔案</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {Object.entries(DOC_LABEL).map(([k, label]) => {
                const url = detail[k]
                if (!url) return null
                const isImage = !url.toLowerCase().endsWith('.pdf')
                return (
                  <button key={k} onClick={() => setPreview({ url, title: label })}
                    style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 8, background: 'var(--bg-pure)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}>
                    {isImage ? (
                      <img src={url} alt={label} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: 90, background: 'var(--bg-deep)', display: 'grid', placeItems: 'center', borderRadius: 6, color: 'var(--ink-mute)', fontSize: 13 }}>📄 PDF</div>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, fontWeight: 500 }}>{label}</p>
                  </button>
                )
              })}
            </div>
            {!Object.keys(DOC_LABEL).some(k => detail[k]) && (
              <p style={{ color: 'var(--ink-mute)', fontSize: 13 }}>尚未上傳任何檔案</p>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {edit && (
        <div onClick={() => !saving && setEdit(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card lg">
            <h3>
              <span>編輯{edit.registration?.retreat_format === 'online' ? '學員資料（線上）' : edit.id ? '食宿登記' : '學員資料（尚未填食宿）'}：{edit.registration?.chinese_name}</span>
              <button onClick={() => !saving && setEdit(null)} className="admin-btn-sm">✕</button>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: 14, background: 'rgba(216, 194, 154, 0.12)', borderRadius: 10, marginBottom: 14, border: '1px solid var(--line)' }}>
              <div>
                <label className="form-label">報名序號（自動）</label>
                <div style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--bg-pure)', border: '1px solid var(--line)', color: 'var(--ink-mute)', fontFamily: 'var(--font-cormorant), monospace' }}>
                  {edit.registration?.member_id || '—'}
                </div>
              </div>
              <div>
                <label className="form-label">學號（{edit.registration?.retreat_format === 'online' ? '自動' : '手動'}）</label>
                <input className="form-input uppercase"
                  placeholder={edit.registration?.retreat_format === 'online' ? '例：C-001' : '例：R-001'}
                  value={edit.registration?.student_id || ''}
                  onChange={e => setEdit({ ...edit, registration: { ...edit.registration, student_id: e.target.value } })} />
              </div>
            </div>

            {edit.registration?.retreat_format === 'online' && (
              <p style={{ color: 'var(--ink-mute)', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: 'rgba(73,85,52,0.05)', borderRadius: 8 }}>
                線上課程學員，無食宿登記資料。僅可編輯學號。
              </p>
            )}
            {edit.registration?.retreat_format !== 'online' && !edit.id && (
              <p style={{ color: 'var(--ink-mute)', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: 'rgba(73,85,52,0.05)', borderRadius: 8 }}>
                學員尚未填寫食宿登記。學號可直接編輯，其餘資料等學員填寫後再行調整。
              </p>
            )}

            {edit.id && <><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <SelectField label="入住日" value={edit.arrival_date} onChange={v => setEdit({ ...edit, arrival_date: v })}
                options={[['2026-08-19', '2026-08-19'], ['2026-08-20', '2026-08-20']]} />
              <SelectField label="離開日" value={edit.departure_date} onChange={v => setEdit({ ...edit, departure_date: v })}
                options={[['2026-08-24', '2026-08-24'], ['2026-08-25', '2026-08-25']]} />
              <SelectField label="繳費方式" value={edit.payment_method} onChange={v => setEdit({ ...edit, payment_method: v })}
                options={[['transfer', '匯款'], ['credit_card', '刷卡']]} />
              <SelectField label="飲食" value={edit.diet} onChange={v => setEdit({ ...edit, diet: v })}
                options={[['meat', '葷食'], ['vegetarian', '素食']]} />
              <SelectField label="過午不食" value={edit.noon_fasting} onChange={v => setEdit({ ...edit, noon_fasting: v })}
                options={[['before_noon', '12 前吃'], ['after_noon', '12 後吃']]} />
              <SelectField label="茶點" value={edit.snacks} onChange={v => setEdit({ ...edit, snacks: v })}
                options={[['snacks_and_drink', '茶點+咖啡/茶'], ['drink_only', '只咖啡/茶']]} />
              <SelectField label="前往方式" value={edit.arrival_transport} onChange={v => setEdit({ ...edit, arrival_transport: v })}
                options={[['self', '8/19 自行'], ['taipei_bus', '台北專車'], ['wuri_bus', '烏日專車'], ['airport_bus_0819', '桃園機場專車'], ['self_0820', '8/20 自行']]} />
              <SelectField label="離開方式" value={edit.departure_transport} onChange={v => setEdit({ ...edit, departure_transport: v })}
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
              <InputField label="緊急聯絡人姓名" value={edit.emergency_name} onChange={v => setEdit({ ...edit, emergency_name: v })} />
              <InputField label="關係" value={edit.emergency_relation} onChange={v => setEdit({ ...edit, emergency_relation: v })} />
              <div style={{ gridColumn: 'span 2' }}>
                <InputField label="緊急聯絡電話" value={edit.emergency_phone} onChange={v => setEdit({ ...edit, emergency_phone: v })} />
              </div>
              <div>
                <label className="form-label">抵台日期</label>
                <input type="date" className="form-input" value={edit.flight_arrival_date || ''}
                  onChange={e => setEdit({ ...edit, flight_arrival_date: e.target.value })} />
              </div>
              <InputField label="抵台時間" value={edit.flight_arrival_time} onChange={v => setEdit({ ...edit, flight_arrival_time: v })} />
              <div>
                <label className="form-label">離台日期</label>
                <input type="date" className="form-input" value={edit.flight_departure_date || ''}
                  onChange={e => setEdit({ ...edit, flight_departure_date: e.target.value })} />
              </div>
              <InputField label="離台時間" value={edit.flight_departure_time} onChange={v => setEdit({ ...edit, flight_departure_time: v })} />

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

            <h4 style={detailH4Style}>檔案管理</h4>
            <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>學員傳錯檔可在此重新上傳或清除</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
              {Object.entries(DOC_LABEL).map(([k, label]) => {
                const kind = k.replace(/_url$/, '')
                const url = edit[k]
                return (
                  <div key={k} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, background: 'var(--bg-pure)' }}>
                    <p style={{ color: 'var(--ink)', fontWeight: 600, marginBottom: 6 }}>{label}</p>
                    {url ? (
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 6 }}>
                        <a href={url} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--green)', fontWeight: 600 }}>檢視</a>
                        <button onClick={() => setEdit({ ...edit, [k]: null })}
                          style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>清除</button>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>未上傳</p>
                    )}
                    <input type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={uploadingKind === kind}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleEditUpload(kind, f) }}
                      style={{ fontSize: 11, color: 'var(--ink-soft)' }} />
                    {uploadingKind === kind && <p style={{ color: 'var(--ink-mute)', marginTop: 4 }}>上傳中⋯</p>}
                  </div>
                )
              })}
            </div>
            </>}

            {editError && (
              <div style={{ marginTop: 12, background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 8, padding: 10, color: 'var(--error)', fontSize: 13 }}>
                {editError}
              </div>
            )}

            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => !saving && setEdit(null)} className="admin-btn-sm">取消</button>
              <button onClick={saveEdit} disabled={saving || !!uploadingKind} className="admin-btn-sm primary">
                {saving ? '儲存中⋯' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div onClick={() => setPreview(null)} className="admin-modal-overlay" style={{ zIndex: 110 }}>
          <div onClick={e => e.stopPropagation()} className="admin-modal-card lg">
            <h3>
              <span>{preview.title}</span>
              <button onClick={() => setPreview(null)} className="admin-btn-sm">✕</button>
            </h3>
            {preview.url.toLowerCase().endsWith('.pdf') ? (
              <iframe src={preview.url} style={{ width: '100%', height: '70vh', border: '1px solid var(--line)', borderRadius: 8 }} />
            ) : (
              <img src={preview.url} alt={preview.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href={preview.url} target="_blank" rel="noreferrer" className="admin-btn-sm">新分頁</a>
              <a href={preview.url} download className="admin-btn-sm primary">下載</a>
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
  marginTop: 18, marginBottom: 10,
  paddingBottom: 6,
  borderBottom: '1px dotted var(--line-strong)',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>{children}</div>
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ color: 'var(--ink)', marginTop: 2 }}>{value || '—'}</div>
    </div>
  )
}

function InputField({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input className="form-input" value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
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

function StudentIdCell({
  reg, onSave, onClear,
}: {
  reg: any
  onSave: (val: string | null) => Promise<boolean> | void
  onClear: () => void
}) {
  const [val, setVal] = useState(reg.student_id || '')
  const [editing, setEditing] = useState(false)
  useEffect(() => { setVal(reg.student_id || '') }, [reg.student_id])

  const save = async () => {
    const trimmed = val.trim()
    if (trimmed === (reg.student_id || '')) { setEditing(false); return }
    await onSave(trimmed || null)
    setEditing(false)
  }
  const cancel = () => { setVal(reg.student_id || ''); setEditing(false) }

  return (
    <div style={{ minWidth: 110 }}>
      {editing ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input autoFocus value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
            placeholder="R-001"
            style={{ width: 90, border: '1px solid var(--line)', borderRadius: 6, padding: '4px 8px', fontFamily: 'var(--font-cormorant), monospace', fontSize: 14, color: 'var(--ink)' }} />
          <button onClick={save} style={{ fontSize: 13, color: 'var(--green-deep)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>儲存</button>
          <button onClick={cancel} style={{ fontSize: 13, color: 'var(--ink-mute)', background: 'none', border: 'none', cursor: 'pointer' }}>取消</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span className="muted">{reg.student_id || '—'}</span>
          <button onClick={() => setEditing(true)}
            style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>✏ 手動</button>
          {reg.student_id && (
            <button onClick={onClear}
              style={{ fontSize: 12, color: 'var(--warning)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>註銷</button>
          )}
        </div>
      )}
    </div>
  )
}

function shortNote(note: string): string {
  if (!note) return ''
  const match5 = note.match(/後五碼[:：]\s*(\d{5})/)
  if (match5) return `後五碼 ${match5[1]}`
  const tradeNo = note.match(/交易號[:：]\s*(\S+)/)
  if (tradeNo) return `綠界 ${tradeNo[1]}`
  return note.length > 20 ? note.slice(0, 20) + '⋯' : note
}

function transportLabel(v: string) {
  return {
    self: '8/19 自行抵達',
    taipei_bus: '主辦專車（8/19 台北車站）',
    wuri_bus: '主辦專車（8/19 烏日高鐵）',
    airport_bus_0819: '主辦專車（8/19 桃園機場）',
    self_0820: '8/20 自行抵達',
  }[v] || v || '—'
}
function busDestLabel(v: string) {
  return {
    taipei_824_pm: '8/24 下午 6:00-6:30 到台北車站',
    taipei_825_am: '8/25 上午 9 點到台北車站',
    wuri_825_am: '8/25 上午 9 點到烏日高鐵',
    taoyuan_824_pm: '8/24 下午 6:00-6:30 到桃園機場',
    taoyuan_825_am: '8/25 上午 9 點到桃園機場',
  }[v] || v
}
