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
  { id: 's1', label: '8/20（四）宋猜尊者', cap: 5 },
  { id: 's2', label: '8/21（五）奧蘭努',   cap: 8 },
  { id: 's3', label: '8/24（一）阿姜給',   cap: 5 },
]
const SMALL_GROUP_CAP = 38 // 每位分組老師總名額
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
    group_serial: number | null
    small_serial: number | null
    notification_sent_at: string | null
  } | null
}

const SERIAL_OPTIONS: number[] = Array.from({ length: 72 }, (_, i) => i - 1) // -1, 0, 1, ..., 70
const fmtSerial = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(n))

export default function InteractiveAdminPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'submitted' | 'group_won' | 'small_won' | 'has_pending' | 'not_notified'>('all')
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkSending, setBulkSending] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/interactive')
    if (res.status === 401 || res.status === 403) { router.push('/admin'); return }
    const d = await res.json()
    setRows(d.data || [])
    // 同步抓 config
    const cRes = await fetch('/api/admin/interactive-config')
    if (cRes.ok) {
      const cfg = await cRes.json()
      setConfigOpen(!!cfg.open)
    }
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const openPreview = async () => {
    setPreviewing(true)
    setMessage('')
    try {
      // 先讀目前的測試學員 email（給 prompt 預設值用）
      const cur = await fetch('/api/admin/preview-test-student').then(r => r.ok ? r.json() : null)
      const defaultEmail = cur?.email && cur.email !== 'preview@test.invalid' ? cur.email : ''
      const promptMsg = cur?.exists
        ? `測試學員 email（自動寄送的測試信會寄到這裡，留空保持不變）：`
        : `請輸入測試學員的 email（自動寄送的測試信會寄到這裡，留空使用預設 preview@test.invalid 不收信）：`
      const input = window.prompt(promptMsg, defaultEmail)
      if (input === null) { setPreviewing(false); return } // 使用者取消

      const res = await fetch('/api/admin/preview-test-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.trim() }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `${res.status}`)
      const url = `/member/interactive?id=${d.id}&code=${encodeURIComponent(d.code)}`
      window.open(url, '_blank', 'noopener')
      const emailLabel = d.email === 'preview@test.invalid' ? '（預設 invalid email，不會收到測試信）' : `（email: ${d.email}）`
      if (d.created) setMessage(`已建立測試學員「[預覽] 測試學員」${emailLabel}，已開新分頁進入互動報名表單`)
      else setMessage(`已開新分頁進入互動報名表單${emailLabel}`)
    } catch (e: any) {
      setMessage(`預覽失敗：${e.message}`)
    } finally {
      setPreviewing(false)
    }
  }

  const toggleOpen = async () => {
    const next = !configOpen
    if (!confirm(next
      ? '確定開放互動報名？學員 dashboard 將出現「互動報名」task card。'
      : '確定關閉互動報名？學員無法繼續送出，dashboard 不再顯示 task card。已送出的資料不受影響。'
    )) return
    setConfigSaving(true)
    setMessage('')
    const res = await fetch('/api/admin/interactive-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open: next }),
    })
    if (res.ok) {
      setConfigOpen(next)
      setMessage(next ? '互動報名已開放' : '互動報名已關閉')
    } else {
      const d = await res.json().catch(() => ({}))
      setMessage(`切換失敗：${d.error || res.status}`)
    }
    setConfigSaving(false)
  }

  // 容量統計：各集體場次與各分組（老師 × 日期）已分配的人數
  const sessionCounts = (() => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const it = r.interactive
      if (it?.group_status === 'won' && it.assigned_session) {
        m.set(it.assigned_session, (m.get(it.assigned_session) || 0) + 1)
      }
    }
    return m
  })()
  const smallCounts = (() => {
    // key = "teacher|date"
    const m = new Map<string, number>()
    for (const r of rows) {
      const it = r.interactive
      if (it?.small_status === 'won' && it.assigned_group && it.assigned_date) {
        const k = `${it.assigned_group}|${it.assigned_date}`
        m.set(k, (m.get(k) || 0) + 1)
      }
    }
    return m
  })()

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
    // 「有未定」= 已送出但至少一邊還是 pending（admin 還沒處理完）
    if (filter === 'has_pending') {
      if (!it) return false
      if (it.group_status !== 'pending' && it.small_status !== 'pending') return false
    }
    // 「中簽未通知」= 任一邊中簽但還沒寄通知信
    if (filter === 'not_notified') {
      if (!it) return false
      const hasWon = it.group_status === 'won' || it.small_status === 'won'
      if (!hasWon) return false
      if (it.notification_sent_at) return false
    }
    return true
  })

  const updateStatus = async (regId: string, patch: any) => {
    const res = await fetch('/api/admin/interactive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: regId, ...patch }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(`更新失敗：${d.error || res.status}`)
      fetchData() // 還原 UI 為 DB 狀態
      return false
    }
    setMessage('')
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
          <p>👇 「集體狀態」「分組狀態」可獨立切換 <strong>未定 / 中簽 / 沒中簽</strong>，可先標中簽再用「編輯指定」補場次／組別／日期，順序自由。</p>
          <p>📧 勾選後按「批次寄中簽通知信」會寄結果信給中簽者；<strong>中簽但場次／組別未指定者會自動跳過</strong>，請補完再按一次。中簽信內含填寫互動作業的連結。</p>
        </div>

        <div className="admin-table-card" style={{
          padding: '14px 18px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          background: configOpen ? 'rgba(73, 85, 52, 0.04)' : 'rgba(216, 194, 154, 0.10)',
          borderLeft: `4px solid ${configOpen ? 'var(--green)' : 'var(--gold-deep)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-noto-serif-tc), serif',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.06em',
              color: 'var(--ink)',
            }}>
              互動報名開放狀態
            </span>
            <span className={`admin-status-badge ${configOpen ? 'ok' : 'warn'}`}>
              {configOpen ? '✓ 已開放' : '○ 未開放'}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', margin: 0, flex: 1, minWidth: 220 }}>
            {configOpen
              ? '會員專區 dashboard 顯示「互動報名」task card，學員可填寫送出。'
              : '會員專區 dashboard 不顯示「互動報名」task card；學員無法送出。已送出資料不受影響。'}
          </p>
          <button
            onClick={openPreview}
            disabled={previewing}
            className="admin-btn-sm"
            title="用測試學員身分開啟互動報名表單，學員不會看到"
          >
            {previewing ? '開啟中⋯' : '🔧 預覽表單（測試學員）'}
          </button>
          <button
            onClick={toggleOpen}
            disabled={configSaving}
            className={`admin-btn-sm ${configOpen ? '' : 'primary'}`}
          >
            {configSaving ? '儲存中⋯' : configOpen ? '關閉互動報名' : '開放互動報名'}
          </button>
        </div>

        <div className="admin-toolbar">
          <input type="text" placeholder="搜尋姓名 / 報名序號 / 學號 / Email"
            value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
          <select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="all">全部錄取者</option>
            <option value="submitted">已送出互動報名</option>
            <option value="has_pending">有未定（admin 還沒處理完）</option>
            <option value="group_won">集體中簽</option>
            <option value="small_won">分組中簽</option>
            <option value="not_notified">中簽但未寄通知信</option>
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

        <CapacityPanel sessionCounts={sessionCounts} smallCounts={smallCounts} />

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
                <th>集體序號</th>
                <th>想要的分組排序</th>
                <th>分組狀態</th>
                <th>指定分組</th>
                <th>分組序號</th>
                <th>通知信</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
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
                      {it?.assigned_session
                        ? SESSION_LABEL[it.assigned_session]
                        : it?.group_status === 'won'
                          ? <span style={{ color: 'var(--error)' }}>需指定</span>
                          : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                      {fmtSerial(it?.group_serial)}
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
                      {it?.assigned_group
                        ? <>{TEACHER_LABEL[it.assigned_group]}<br /><span style={{ fontSize: 11 }}>{it.assigned_date || (it.small_status === 'won' ? <span style={{ color: 'var(--error)' }}>需指定日期</span> : '')}</span></>
                        : it?.small_status === 'won'
                          ? <span style={{ color: 'var(--error)' }}>需指定</span>
                          : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                      {fmtSerial(it?.small_serial)}
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
  const [groupSerial, setGroupSerial] = useState<string>(it.group_serial !== null && it.group_serial !== undefined ? String(it.group_serial) : '')
  const [smallSerial, setSmallSerial] = useState<string>(it.small_serial !== null && it.small_serial !== undefined ? String(it.small_serial) : '')

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card lg" onClick={e => e.stopPropagation()}>
        <h3>
          <span>互動指定：{row.registration.chinese_name}（{row.registration.member_id || '—'}）</span>
          <button onClick={onClose} className="admin-btn-sm">✕</button>
        </h3>

        <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 6, marginBottom: 18 }}>
          可先編場次與互動序號（狀態維持「未定」），全部分配妥當後再批次改成「中簽」並寄通知信。「沒中簽」會清空場次與序號。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>

          {/* 集體互動 */}
          <div style={{ background: 'rgba(73, 85, 52, 0.04)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ fontFamily: 'var(--font-noto-serif-tc), serif', fontSize: 14, fontWeight: 700, color: 'var(--green-deep)', letterSpacing: '0.08em', marginBottom: 12 }}>
              集體互動
            </h4>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label className="form-label">狀態</label>
                <select className="form-select" value={groupStatus} onChange={e => setGroupStatus(e.target.value as any)}>
                  <option value="pending">未定</option>
                  <option value="won">中簽</option>
                  <option value="lost">沒中簽</option>
                </select>
              </div>
              {groupStatus !== 'lost' && (
                <>
                  <div>
                    <label className="form-label">指定場次{groupStatus === 'won' && <span className="required">*</span>}</label>
                    <select className="form-select" value={assignedSession} onChange={e => setAssignedSession(e.target.value)}>
                      <option value="">（未指定）</option>
                      {SESSIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {it.wanted_sessions?.length > 0 && (
                      <p className="form-hint">學員想要：{it.wanted_sessions.map(s => SESSION_LABEL[s]).join('、')}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">互動序號</label>
                    <select className="form-select" value={groupSerial} onChange={e => setGroupSerial(e.target.value)}>
                      <option value="">（未指定）</option>
                      {SERIAL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <p className="form-hint">範圍 -1 ~ 15</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 分組互動 */}
          <div style={{ background: 'rgba(180, 147, 88, 0.06)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ fontFamily: 'var(--font-noto-serif-tc), serif', fontSize: 14, fontWeight: 700, color: 'var(--gold-deep)', letterSpacing: '0.08em', marginBottom: 12 }}>
              分組互動
            </h4>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label className="form-label">狀態</label>
                <select className="form-select" value={smallStatus} onChange={e => setSmallStatus(e.target.value as any)}>
                  <option value="pending">未定</option>
                  <option value="won">中簽</option>
                  <option value="lost">沒中簽</option>
                </select>
              </div>
              {smallStatus !== 'lost' && (
                <>
                  <div>
                    <label className="form-label">指定分組{smallStatus === 'won' && <span className="required">*</span>}</label>
                    <select className="form-select" value={assignedGroup} onChange={e => setAssignedGroup(e.target.value)}>
                      <option value="">（未指定）</option>
                      {TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name} 組</option>)}
                    </select>
                    {it.wanted_ranking?.length > 0 && (
                      <p className="form-hint">學員排序：{it.wanted_ranking.map((t, i) => `${i + 1}.${TEACHER_LABEL[t] || t}`).join(' ')}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">指定日期{smallStatus === 'won' && <span className="required">*</span>}</label>
                    <select className="form-select" value={assignedDate} onChange={e => setAssignedDate(e.target.value)}>
                      <option value="">（未指定）</option>
                      <option value="2026-08-21">2026-08-21（週五）</option>
                      <option value="2026-08-22">2026-08-22（週六）</option>
                      <option value="2026-08-23">2026-08-23（週日）</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">互動序號</label>
                    <select className="form-select" value={smallSerial} onChange={e => setSmallSerial(e.target.value)}>
                      <option value="">（未指定）</option>
                      {SERIAL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <p className="form-hint">範圍 -1 ~ 15</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="admin-btn-sm">取消</button>
          <button
            onClick={() => onSave({
              group_status: groupStatus,
              small_status: smallStatus,
              // 'lost' 清空；其他狀態 (pending/won) 保留 admin 填的值
              assigned_session: groupStatus === 'lost' ? null : (assignedSession || null),
              group_serial: groupStatus === 'lost' ? null : (groupSerial === '' ? null : Number(groupSerial)),
              assigned_group: smallStatus === 'lost' ? null : (assignedGroup || null),
              assigned_date: smallStatus === 'lost' ? null : (assignedDate || null),
              small_serial: smallStatus === 'lost' ? null : (smallSerial === '' ? null : Number(smallSerial)),
            })}
            className="admin-btn-sm primary">儲存</button>
        </div>
      </div>
    </div>
  )
}

function CapacityPanel({ sessionCounts, smallCounts }: {
  sessionCounts: Map<string, number>
  smallCounts: Map<string, number>
}) {
  const [open, setOpen] = useState(false)

  const totalGroup = SESSIONS.reduce((s, x) => s + (sessionCounts.get(x.id) || 0), 0)
  const groupCap = SESSIONS.reduce((s, x) => s + x.cap, 0)
  const totalSmall = Array.from(smallCounts.values()).reduce((s, x) => s + x, 0)
  const smallCap = TEACHERS.length * SMALL_GROUP_CAP

  // Compute per-teacher totals for over-capacity check
  const teacherTotals = new Map<string, number>()
  for (const [key, count] of smallCounts.entries()) {
    const teacher = key.split('|')[0]
    teacherTotals.set(teacher, (teacherTotals.get(teacher) || 0) + count)
  }

  const anyOver = SESSIONS.some(s => (sessionCounts.get(s.id) || 0) > s.cap)
    || Array.from(teacherTotals.entries()).some(([_, c]) => c > SMALL_GROUP_CAP)

  return (
    <div className="admin-table-card" style={{ padding: 0, marginBottom: 14 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "12px 18px",
          background: anyOver ? "rgba(184, 82, 58, 0.06)" : "rgba(73, 85, 52, 0.04)",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          fontFamily: "var(--font-noto-serif-tc), serif", fontWeight: 700, fontSize: 14,
          color: "var(--ink)", letterSpacing: "0.06em",
        }}>
        <span>{open ? "▼" : "▶"}</span>
        <span>容量統計</span>
        <span style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 500 }}>
          集體 {totalGroup}／{groupCap}　·　分組 {totalSmall}／{smallCap}
        </span>
        {anyOver && <span className="admin-status-badge error" style={{ marginLeft: "auto" }}>有超額</span>}
      </button>

      {open && (
        <div style={{ padding: "14px 18px 18px", borderTop: "1px solid var(--line)" }}>
          <div style={{ marginBottom: 14 }}>
            <h5 style={{ fontFamily: "var(--font-noto-serif-tc), serif", fontSize: 13, color: "var(--green-deep)", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
              集體互動場次
            </h5>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {SESSIONS.map(s => {
                const c = sessionCounts.get(s.id) || 0
                const over = c > s.cap
                return (
                  <div key={s.id} style={{
                    padding: "8px 12px",
                    background: over ? "rgba(184, 82, 58, 0.08)" : "var(--bg-pure)",
                    border: `1px solid ${over ? "rgba(184, 82, 58, 0.3)" : "var(--line)"}`,
                    borderRadius: 8, fontSize: 12.5,
                  }}>
                    <div style={{ color: "var(--ink-soft)", fontSize: 11.5 }}>{s.label}</div>
                    <div style={{
                      fontFamily: "var(--font-cormorant), serif", fontWeight: 700, fontSize: 16,
                      color: over ? "var(--error)" : c >= s.cap ? "var(--gold-deep)" : "var(--green-deep)",
                      marginTop: 2,
                    }}>
                      {c} ／ {s.cap}{over && " ⚠"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h5 style={{ fontFamily: "var(--font-noto-serif-tc), serif", fontSize: 13, color: "var(--gold-deep)", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
              分組互動（每位老師名額 {SMALL_GROUP_CAP}）
            </h5>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {TEACHERS.map(t => {
                const c = teacherTotals.get(t.id) || 0
                const over = c > SMALL_GROUP_CAP
                return (
                  <div key={t.id} style={{
                    padding: "8px 12px",
                    background: over ? "rgba(184, 82, 58, 0.08)" : "var(--bg-pure)",
                    border: `1px solid ${over ? "rgba(184, 82, 58, 0.3)" : "var(--line)"}`,
                    borderRadius: 8, fontSize: 12.5,
                  }}>
                    <div style={{ color: "var(--ink-soft)", fontSize: 11.5 }}>{t.name}</div>
                    <div style={{
                      fontFamily: "var(--font-cormorant), serif", fontWeight: 700, fontSize: 16,
                      color: over ? "var(--error)" : c >= SMALL_GROUP_CAP ? "var(--gold-deep)" : "var(--green-deep)",
                      marginTop: 2,
                    }}>
                      {c} ／ {SMALL_GROUP_CAP}{over && " ⚠"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
