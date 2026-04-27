'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const TEACHERS = [
  { id: 'prasan',   name: '阿姜巴山' },
  { id: 'nat',      name: '阿姜納' },
  { id: 'nitiya',   name: '阿姜妮' },
  { id: 'napatpol', name: '阿姜松' },
]
const TEACHER_LABEL: Record<string, string> = Object.fromEntries(TEACHERS.map(t => [t.id, t.name]))

const SESSIONS = [
  { id: 's1', label: '8/21（五）巴山' },
  { id: 's2', label: '8/21（五）納' },
  { id: 's3', label: '8/22（六）妮' },
  { id: 's4', label: '8/22（六）松' },
  { id: 's5', label: '8/23（日）巴山' },
  { id: 's6', label: '8/23（日）妮' },
]
const SESSION_LABEL: Record<string, string> = Object.fromEntries(SESSIONS.map(s => [s.id, s.label]))

type Row = {
  registration: { id: string; chinese_name: string; member_id: string | null; student_id: string | null; random_code: string; email: string; residence: string }
  interactive: {
    wanted_sessions: string[]
    wanted_ranking: string[]
    group_status: 'pending' | 'won' | 'lost'
    small_status: 'pending' | 'won' | 'lost'
    assigned_session: string | null
    assigned_group: string | null
    assigned_date: string | null
    notification_sent_at: string | null
  } | null
}

export default function InteractiveAdminPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'submitted' | 'group_won' | 'small_won' | 'pending'>('all')
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkSending, setBulkSending] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/interactive')
    if (res.status === 401 || res.status === 403) { router.push('/admin'); return }
    const d = await res.json()
    setRows(d.data || [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const filtered = rows.filter(r => {
    const reg = r.registration
    const it = r.interactive
    if (search) {
      const q = search.toLowerCase()
      if (!(
        (reg.chinese_name || '').toLowerCase().includes(q) ||
        (reg.member_id || '').toLowerCase().includes(q) ||
        (reg.student_id || '').toLowerCase().includes(q) ||
        (reg.email || '').toLowerCase().includes(q)
      )) return false
    }
    if (filter === 'submitted' && !it) return false
    if (filter === 'group_won' && it?.group_status !== 'won') return false
    if (filter === 'small_won' && it?.small_status !== 'won') return false
    if (filter === 'pending' && it && (it.group_status !== 'pending' || it.small_status !== 'pending')) return false
    if (filter === 'pending' && !it) return false
    return true
  })

  const updateStatus = async (regId: string, patch: any) => {
    const res = await fetch('/api/admin/interactive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: regId, ...patch }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMessage(`更新失敗：${d.error || res.status}`); return false }
    fetchData()
    return true
  }

  const sendNotifications = async () => {
    if (bulkSelected.length === 0) { alert('請先勾選對象'); return }
    if (!confirm(`寄出互動結果通知信給 ${bulkSelected.length} 位學員？`)) return
    setBulkSending(true)
    setMessage('')
    const res = await fetch('/api/admin/interactive/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const d = await res.json()
    setMessage(d.message || (res.ok ? '寄送完成' : '寄送失敗'))
    setBulkSending(false)
    if (res.ok) { setBulkSelected([]); fetchData() }
  }

  const toggleAll = () => {
    const ids = filtered.map(r => r.registration.id)
    setBulkSelected(bulkSelected.length === ids.length ? [] : ids)
  }
  const toggleOne = (id: string) => {
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main">
        <div className="admin-info-strip" style={{ background: 'rgba(73, 85, 52, 0.05)', borderLeftColor: 'var(--green)' }}>
          <p>🎲 列出所有錄取學員。<strong>已送出互動報名</strong>者會顯示「想要的場次／排序」。</p>
          <p>👇 「集體狀態」「分組狀態」下拉選 <strong>未定 / 中簽 / 沒中簽</strong>。中簽時請按「編輯」填指定的場次／組別／日期。</p>
          <p>📧 勾選後按「批次寄中簽通知信」，學員會收到結果信，中簽者信內含填寫互動作業的連結。</p>
        </div>

        <div className="admin-toolbar">
          <input type="text" placeholder="搜尋姓名 / 報名序號 / 學號 / Email"
            value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
          <select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="all">全部錄取者</option>
            <option value="submitted">已送出互動報名</option>
            <option value="group_won">集體中簽</option>
            <option value="small_won">分組中簽</option>
            <option value="pending">未定（已送出但 admin 未處理）</option>
          </select>
          <button onClick={fetchData} className="admin-btn-sm">重新整理</button>
          <label>
            <input type="checkbox" checked={bulkSelected.length > 0 && bulkSelected.length === filtered.length}
              onChange={toggleAll} />
            全選本頁
          </label>
          <button onClick={sendNotifications} disabled={bulkSending}
            className="admin-btn-sm primary">
            {bulkSending ? '寄送中⋯' : `批次寄中簽通知信（${bulkSelected.length}）`}
          </button>
          {message && <span style={{ fontSize: 13, color: 'var(--green-deep)', fontWeight: 600 }}>{message}</span>}
          <span className="count">共 {filtered.length} 筆</span>
        </div>

        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>姓名</th>
                <th>報名序號</th>
                <th>想要的集體場次</th>
                <th>集體狀態</th>
                <th>指定場次</th>
                <th>想要的分組排序</th>
                <th>分組狀態</th>
                <th>指定分組</th>
                <th>通知信</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
              ) : filtered.map(r => {
                const it = r.interactive
                return (
                  <tr key={r.registration.id}>
                    <td>
                      <input type="checkbox"
                        checked={bulkSelected.includes(r.registration.id)}
                        onChange={() => toggleOne(r.registration.id)} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{r.registration.chinese_name}</td>
                    <td className="mono">{r.registration.member_id || '—'}</td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.wanted_sessions?.length
                        ? it.wanted_sessions.map(s => SESSION_LABEL[s] || s).join('、')
                        : it ? <span style={{ color: 'var(--ink-mute)' }}>（不報名）</span> : <span style={{ color: 'var(--ink-mute)' }}>未送出</span>}
                    </td>
                    <td>
                      {it ? (
                        <select value={it.group_status}
                          onChange={e => updateStatus(r.registration.id, { group_status: e.target.value })}
                          className={`admin-status-badge ${statusCls(it.group_status)}`}
                          style={{ cursor: 'pointer', appearance: 'none', paddingRight: 10, fontFamily: 'inherit' }}>
                          <option value="pending">未定</option>
                          <option value="won">中簽</option>
                          <option value="lost">沒中簽</option>
                        </select>
                      ) : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.group_status === 'won'
                        ? (it.assigned_session ? SESSION_LABEL[it.assigned_session] : <span style={{ color: 'var(--error)' }}>需指定</span>)
                        : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.wanted_ranking?.length
                        ? it.wanted_ranking.map((t, i) => `${i + 1}.${TEACHER_LABEL[t] || t}`).join(' ')
                        : it ? <span style={{ color: 'var(--ink-mute)' }}>（不報名）</span> : '—'}
                    </td>
                    <td>
                      {it ? (
                        <select value={it.small_status}
                          onChange={e => updateStatus(r.registration.id, { small_status: e.target.value })}
                          className={`admin-status-badge ${statusCls(it.small_status)}`}
                          style={{ cursor: 'pointer', appearance: 'none', paddingRight: 10, fontFamily: 'inherit' }}>
                          <option value="pending">未定</option>
                          <option value="won">中簽</option>
                          <option value="lost">沒中簽</option>
                        </select>
                      ) : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.small_status === 'won'
                        ? (it.assigned_group
                            ? <>{TEACHER_LABEL[it.assigned_group]}<br /><span style={{ fontSize: 11 }}>{it.assigned_date || <span style={{ color: 'var(--error)' }}>需指定日期</span>}</span></>
                            : <span style={{ color: 'var(--error)' }}>需指定</span>)
                        : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 11 }}>
                      {it?.notification_sent_at
                        ? <span style={{ color: 'var(--green-deep)' }}>✓ {new Date(it.notification_sent_at).toLocaleDateString('zh-TW')}</span>
                        : '—'}
                    </td>
                    <td>
                      <button onClick={() => setEditing(r)} disabled={!it} className="admin-btn-sm gold">編輯指定</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditModal row={editing}
          onClose={() => setEditing(null)}
          onSave={async patch => {
            const ok = await updateStatus(editing.registration.id, patch)
            if (ok) setEditing(null)
          }} />
      )}
    </div>
  )
}

function statusCls(s: string) {
  return s === 'won' ? 'ok' : s === 'lost' ? 'error' : 'warn'
}

function EditModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (patch: any) => void }) {
  const it = row.interactive!
  const [groupStatus, setGroupStatus] = useState(it.group_status)
  const [smallStatus, setSmallStatus] = useState(it.small_status)
  const [assignedSession, setAssignedSession] = useState(it.assigned_session || '')
  const [assignedGroup, setAssignedGroup] = useState(it.assigned_group || '')
  const [assignedDate, setAssignedDate] = useState(it.assigned_date || '')

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
        <h3>
          <span>互動指定：{row.registration.chinese_name}（{row.registration.member_id || '—'}）</span>
          <button onClick={onClose} className="admin-btn-sm">✕</button>
        </h3>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="form-label">集體互動狀態</label>
            <select className="form-select" value={groupStatus} onChange={e => setGroupStatus(e.target.value as any)}>
              <option value="pending">未定</option>
              <option value="won">中簽</option>
              <option value="lost">沒中簽</option>
            </select>
            {groupStatus === 'won' && (
              <div style={{ marginTop: 10 }}>
                <label className="form-label">指定場次 <span className="required">*</span></label>
                <select className="form-select" value={assignedSession} onChange={e => setAssignedSession(e.target.value)}>
                  <option value="">請選擇場次</option>
                  {SESSIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                {it.wanted_sessions?.length > 0 && (
                  <p className="form-hint">學員想要：{it.wanted_sessions.map(s => SESSION_LABEL[s]).join('、')}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">分組互動狀態</label>
            <select className="form-select" value={smallStatus} onChange={e => setSmallStatus(e.target.value as any)}>
              <option value="pending">未定</option>
              <option value="won">中簽</option>
              <option value="lost">沒中簽</option>
            </select>
            {smallStatus === 'won' && (
              <>
                <div style={{ marginTop: 10 }}>
                  <label className="form-label">指定分組 <span className="required">*</span></label>
                  <select className="form-select" value={assignedGroup} onChange={e => setAssignedGroup(e.target.value)}>
                    <option value="">請選擇</option>
                    {TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name} 組</option>)}
                  </select>
                  {it.wanted_ranking?.length > 0 && (
                    <p className="form-hint">學員排序：{it.wanted_ranking.map((t, i) => `${i + 1}.${TEACHER_LABEL[t] || t}`).join(' ')}</p>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <label className="form-label">指定日期 <span className="required">*</span></label>
                  <select className="form-select" value={assignedDate} onChange={e => setAssignedDate(e.target.value)}>
                    <option value="">請選擇</option>
                    <option value="2026-08-21">2026-08-21（週五）</option>
                    <option value="2026-08-22">2026-08-22（週六）</option>
                    <option value="2026-08-23">2026-08-23（週日）</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="admin-btn-sm">取消</button>
          <button
            onClick={() => onSave({
              group_status: groupStatus,
              small_status: smallStatus,
              assigned_session: groupStatus === 'won' ? assignedSession : null,
              assigned_group: smallStatus === 'won' ? assignedGroup : null,
              assigned_date: smallStatus === 'won' ? assignedDate : null,
            })}
            className="admin-btn-sm primary">儲存</button>
        </div>
      </div>
    </div>
  )
}
