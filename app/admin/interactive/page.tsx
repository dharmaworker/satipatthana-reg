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
const SMALL_WAITLIST_CAP = 4  // 每位老師每個日期候補名額
const SESSION_WAITLIST_CAP = 4 // 每個集體場次候補名額
const SMALL_DATES = [
  { date: '2026-08-21', cap: 13 },
  { date: '2026-08-22', cap: 13 },
  { date: '2026-08-23', cap: 12 },
]
const SESSION_LABEL: Record<string, string> = Object.fromEntries(SESSIONS.map(s => [s.id, s.label]))

type Row = {
  registration: { id: string; chinese_name: string; member_id: string | null; student_id: string | null; random_code: string; email: string; residence: string }
  interactive: {
    wanted_sessions: string[]
    wanted_ranking: string[]
    group_status: 'pending' | 'won' | 'waitlist' | 'lost' | 'abstain'
    small_status: 'pending' | 'won' | 'waitlist' | 'lost' | 'abstain'
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

const PAGE_SIZE = 50

export default function InteractiveAdminPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'submitted' | 'group_won' | 'small_won' | 'has_pending' | 'not_notified'>('all')
  const [page, setPage] = useState(1)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkSending, setBulkSending] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [autoDrawOpen, setAutoDrawOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/interactive')
    if (res.status === 401 || res.status === 403) { router.push('/admin'); return }
    const d = await res.json()
    setRows(d.data || [])
    setPage(1)
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
      if (it?.group_status === 'won' && it.assigned_session)
        m.set(it.assigned_session, (m.get(it.assigned_session) || 0) + 1)
    }
    return m
  })()
  const sessionWaitlistCounts = (() => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const it = r.interactive
      if (it?.group_status === 'waitlist' && it.assigned_session)
        m.set(it.assigned_session, (m.get(it.assigned_session) || 0) + 1)
    }
    return m
  })()
  const smallWaitlistCounts = (() => {
    // key = "teacher|date"，候補人數
    const m = new Map<string, number>()
    for (const r of rows) {
      const it = r.interactive
      if (it?.small_status === 'waitlist' && it.assigned_group && it.assigned_date) {
        const k = `${it.assigned_group}|${it.assigned_date}`
        m.set(k, (m.get(k) || 0) + 1)
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
    // 「有未定」= 已送出，且至少一邊非棄權但仍是 pending（admin 還沒處理完）
    if (filter === 'has_pending') {
      if (!it) return false
      const groupPending = it.group_status === 'pending' && (it.wanted_sessions || []).length > 0
      const smallPending = it.small_status === 'pending' && (it.wanted_ranking || []).length > 0
      if (!groupPending && !smallPending) return false
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

  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
          <select value={filter} onChange={e => { setFilter(e.target.value as any); setPage(1) }}>
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
          <button onClick={() => setAutoDrawOpen(true)}
            className="admin-btn-sm"
            style={{ background: 'rgba(180, 147, 88, 0.15)', borderColor: 'var(--gold-deep)', color: 'var(--gold-deep)', fontWeight: 700 }}>
            🎲 自動抽簽
          </button>
          {message && <span style={{ fontSize: 13, color: 'var(--green-deep)', fontWeight: 600 }}>{message}</span>}
          <span className="count">共 {filtered.length} 筆</span>
        </div>

        <CapacityPanel sessionCounts={sessionCounts} sessionWaitlistCounts={sessionWaitlistCounts} smallCounts={smallCounts} smallWaitlistCounts={smallWaitlistCounts} />

        <div className="admin-table-card scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>姓名</th>
                <th>報名序號</th>
                <th>學號</th>
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
                <tr><td colSpan={14} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={14} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無資料</td></tr>
              ) : pagedRows.map(r => {
                const it = r.interactive
                const groupAbstained = !!it && (it.wanted_sessions || []).length === 0
                const smallAbstained = !!it && (it.wanted_ranking || []).length === 0
                return (
                  <tr key={r.registration.id}>
                    <td>
                      <input type="checkbox"
                        checked={bulkSelected.includes(r.registration.id)}
                        onChange={() => toggleOne(r.registration.id)} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{r.registration.chinese_name}</td>
                    <td className="mono">{r.registration.member_id || '—'}</td>
                    <td className="mono">{r.registration.student_id || '—'}</td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.wanted_sessions?.length
                        ? it.wanted_sessions.map(s => SESSION_LABEL[s] || `（已移除：${s}）`).join('、')
                        : it ? <span style={{ color: 'var(--ink-mute)' }}>（不報名）</span> : <span style={{ color: 'var(--ink-mute)' }}>未送出</span>}
                    </td>
                    <td>
                      {groupAbstained ? '—' : it ? (
                        <select value={it.group_status}
                          onChange={e => updateStatus(r.registration.id, { group_status: e.target.value })}
                          className={`admin-status-badge ${statusCls(it.group_status)}`}
                          style={{ cursor: 'pointer', appearance: 'none', paddingRight: 10, fontFamily: 'inherit' }}>
                          <option value="pending">未定</option>
                          <option value="won">中簽</option>
                          <option value="waitlist">候補</option>
                          <option value="lost">沒中簽</option>
                          <option value="abstain">棄權</option>
                        </select>
                      ) : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {groupAbstained ? '—' : it?.assigned_session
                        ? SESSION_LABEL[it.assigned_session]
                        : it?.group_status === 'won'
                          ? <span style={{ color: 'var(--error)' }}>需指定</span>
                          : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                      {groupAbstained ? '—' : fmtSerial(it?.group_serial)}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {it?.wanted_ranking?.length
                        ? it.wanted_ranking.map((t, i) => `${i + 1}.${TEACHER_LABEL[t] || t}`).join(' ')
                        : it ? <span style={{ color: 'var(--ink-mute)' }}>（不報名）</span> : '—'}
                    </td>
                    <td>
                      {smallAbstained ? '—' : it ? (
                        <select value={it.small_status}
                          onChange={e => updateStatus(r.registration.id, { small_status: e.target.value })}
                          className={`admin-status-badge ${statusCls(it.small_status)}`}
                          style={{ cursor: 'pointer', appearance: 'none', paddingRight: 10, fontFamily: 'inherit' }}>
                          <option value="pending">未定</option>
                          <option value="won">中簽</option>
                          <option value="waitlist">候補</option>
                          <option value="lost">沒中簽</option>
                          <option value="abstain">棄權</option>
                        </select>
                      ) : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {smallAbstained ? '—' : it?.assigned_group
                        ? <>{TEACHER_LABEL[it.assigned_group]}<br /><span style={{ fontSize: 11 }}>{it.assigned_date || (it.small_status === 'won' ? <span style={{ color: 'var(--error)' }}>需指定日期</span> : '')}</span></>
                        : it?.small_status === 'won'
                          ? <span style={{ color: 'var(--error)' }}>需指定</span>
                          : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                      {smallAbstained ? '—' : fmtSerial(it?.small_serial)}
                    </td>
                    <td className="muted" style={{ fontSize: 11 }}>
                      {it?.notification_sent_at
                        ? <span style={{ color: 'var(--green-deep)' }}>✓ {new Date(it.notification_sent_at).toLocaleDateString('zh-TW')}</span>
                        : '—'}
                    </td>
                    <td>
                      <button onClick={() => setEditing(r)} disabled={!it || (groupAbstained && smallAbstained)} className="admin-btn-sm gold">編輯指定</button>
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

      {editing && (
        <EditModal row={editing}
          onClose={() => setEditing(null)}
          onSave={async patch => {
            const ok = await updateStatus(editing.registration.id, patch)
            if (ok) setEditing(null)
          }} />
      )}

      {autoDrawOpen && (
        <AutoDrawModal
          rows={rows}
          onClose={() => setAutoDrawOpen(false)}
          onApplied={() => { setAutoDrawOpen(false); fetchData() }}
        />
      )}
    </div>
  )
}

function statusCls(s: string) {
  return s === 'won' ? 'ok' : s === 'lost' ? 'error' : s === 'waitlist' ? 'info' : s === 'abstain' ? '' : 'warn'
}

function EditModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (patch: any) => void }) {
  const it = row.interactive!
  const groupAbstained = (it.wanted_sessions || []).length === 0
  const smallAbstained = (it.wanted_ranking || []).length === 0
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
            {groupAbstained ? (
              <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>學員已棄權，無法設定狀態。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label className="form-label">狀態</label>
                  <select className="form-select" value={groupStatus} onChange={e => setGroupStatus(e.target.value as any)}>
                    <option value="pending">未定</option>
                    <option value="won">中簽</option>
                    <option value="waitlist">候補</option>
                    <option value="lost">沒中簽</option>
                    <option value="abstain">棄權</option>
                  </select>
                </div>
                {(groupStatus === 'won' || groupStatus === 'waitlist') && (
                  <>
                    <div>
                      <label className="form-label">指定場次{groupStatus === 'won' && <span className="required">*</span>}</label>
                      <select className="form-select" value={assignedSession} onChange={e => setAssignedSession(e.target.value)}>
                        <option value="">（未指定）</option>
                        {(it.wanted_sessions || []).map(sid => (
                          <option key={sid} value={sid}>{SESSION_LABEL[sid] || `（已移除：${sid}）`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">互動序號</label>
                      <select className="form-select" value={groupSerial} onChange={e => setGroupSerial(e.target.value)}>
                        <option value="">（未指定）</option>
                        {SERIAL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <p className="form-hint">範圍 -1 ~ 70</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 分組互動 */}
          <div style={{ background: 'rgba(180, 147, 88, 0.06)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ fontFamily: 'var(--font-noto-serif-tc), serif', fontSize: 14, fontWeight: 700, color: 'var(--gold-deep)', letterSpacing: '0.08em', marginBottom: 12 }}>
              分組互動
            </h4>
            {smallAbstained ? (
              <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>學員已棄權，無法設定狀態。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label className="form-label">狀態</label>
                  <select className="form-select" value={smallStatus} onChange={e => setSmallStatus(e.target.value as any)}>
                    <option value="pending">未定</option>
                    <option value="won">中簽</option>
                    <option value="waitlist">候補</option>
                    <option value="lost">沒中簽</option>
                    <option value="abstain">棄權</option>
                  </select>
                </div>
                {(smallStatus === 'won' || smallStatus === 'waitlist') && (
                  <>
                    <div>
                      <label className="form-label">指定分組{smallStatus === 'won' && <span className="required">*</span>}</label>
                      <select className="form-select" value={assignedGroup} onChange={e => setAssignedGroup(e.target.value)}>
                        <option value="">（未指定）</option>
                        {(it.wanted_ranking || []).map((tid, i) => (
                          <option key={tid} value={tid}>第{i + 1}意願　{TEACHER_LABEL[tid] || tid} 組</option>
                        ))}
                      </select>
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
                      <p className="form-hint">範圍 -1 ~ 70</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="admin-btn-sm">取消</button>
          <button
            onClick={() => onSave({
              group_status: groupStatus,
              small_status: smallStatus,
              // 'pending'/'lost' 清空；'won'/'waitlist' 保留 admin 填的值
              assigned_session: (groupStatus === 'won' || groupStatus === 'waitlist') ? (assignedSession || null) : null,
              group_serial: (groupStatus === 'won' || groupStatus === 'waitlist') ? (groupSerial === '' ? null : Number(groupSerial)) : null,
              assigned_group: (smallStatus === 'won' || smallStatus === 'waitlist') ? (assignedGroup || null) : null,
              assigned_date: (smallStatus === 'won' || smallStatus === 'waitlist') ? (assignedDate || null) : null,
              small_serial: (smallStatus === 'won' || smallStatus === 'waitlist') ? (smallSerial === '' ? null : Number(smallSerial)) : null,
            })}
            className="admin-btn-sm primary">儲存</button>
        </div>
      </div>
    </div>
  )
}

function CapacityPanel({ sessionCounts, sessionWaitlistCounts, smallCounts, smallWaitlistCounts }: {
  sessionCounts: Map<string, number>
  sessionWaitlistCounts: Map<string, number>
  smallCounts: Map<string, number>
  smallWaitlistCounts: Map<string, number>
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
              集體互動場次（每場次候補 {SESSION_WAITLIST_CAP}）
            </h5>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {SESSIONS.map(s => {
                const c = sessionCounts.get(s.id) || 0
                const wc = sessionWaitlistCounts.get(s.id) || 0
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
                    <div style={{ fontSize: 11, color: "#2a6fa8", marginTop: 2 }}>
                      候補 {wc} ／ {SESSION_WAITLIST_CAP}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h5 style={{ fontFamily: "var(--font-noto-serif-tc), serif", fontSize: 13, color: "var(--gold-deep)", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
              分組互動（每位老師名額 {SMALL_GROUP_CAP}，每日期候補 {SMALL_WAITLIST_CAP}）
            </h5>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {TEACHERS.map(t => {
                const c = teacherTotals.get(t.id) || 0
                const over = c > SMALL_GROUP_CAP
                // 候補人數（per teacher，跨所有日期）
                const wc = SMALL_DATES.reduce((sum, d) => sum + (smallWaitlistCounts.get(`${t.id}|${d.date}`) || 0), 0)
                const waitlistTotal = SMALL_DATES.length * SMALL_WAITLIST_CAP
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
                    <div style={{ fontSize: 11, color: "#2a6fa8", marginTop: 2 }}>
                      候補 {wc} ／ {waitlistTotal}
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

// ─────────────────────────────────────────────────────────────
// 自動抽簽
// ─────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type DrawMode = 'group' | 'small'
type GroupScope = 'all' | string

type DrawResult = {
  registration_id: string
  chinese_name: string
  member_id: string | null
  mode: DrawMode
  status: 'won' | 'waitlist' | 'lost'
  label: string
  serial: number | null
  assigned_session?: string | null
  assigned_group?: string | null
  assigned_date?: string | null
}

function runGroupDraw(rows: Row[], scope: GroupScope): DrawResult[] {
  const sessions = scope === 'all' ? SESSIONS : SESSIONS.filter(s => s.id === scope)

  const alreadyWon = new Map<string, number>()
  const alreadyWaitlist = new Map<string, number>()
  const maxSerial = new Map<string, number>()
  const maxWaitlistSerial = new Map<string, number>()
  for (const r of rows) {
    const it = r.interactive
    if (it?.assigned_session) {
      if (it.group_status === 'won') {
        alreadyWon.set(it.assigned_session, (alreadyWon.get(it.assigned_session) || 0) + 1)
        if (it.group_serial !== null && it.group_serial !== undefined)
          maxSerial.set(it.assigned_session, Math.max(maxSerial.get(it.assigned_session) || 0, it.group_serial))
      } else if (it.group_status === 'waitlist') {
        alreadyWaitlist.set(it.assigned_session, (alreadyWaitlist.get(it.assigned_session) || 0) + 1)
        if (it.group_serial !== null && it.group_serial !== undefined)
          maxWaitlistSerial.set(it.assigned_session, Math.max(maxWaitlistSerial.get(it.assigned_session) || 0, it.group_serial))
      }
    }
  }

  const remaining = new Map(sessions.map(s => [s.id, Math.max(0, s.cap - (alreadyWon.get(s.id) || 0))]))
  const waitlistRemaining = new Map(sessions.map(s => [s.id, Math.max(0, SESSION_WAITLIST_CAP - (alreadyWaitlist.get(s.id) || 0))]))
  const nextSerial = new Map(sessions.map(s => [s.id, (maxSerial.get(s.id) || 0) + 1]))
  const waitlistNextSerial = new Map(sessions.map(s => [s.id, (maxWaitlistSerial.get(s.id) || 0) + 1]))

  const eligible = rows.filter(r => {
    const it = r.interactive
    if (!it || it.group_status !== 'pending') return false
    const wanted = it.wanted_sessions || []
    return scope === 'all' ? wanted.length > 0 : wanted.some(s => s === scope)
  })

  // Phase 1：中簽
  const results: DrawResult[] = []
  for (const row of shuffle(eligible)) {
    const wanted = (row.interactive!.wanted_sessions || []).filter(s => sessions.find(x => x.id === s))
    let assigned: { session: string; serial: number } | null = null
    for (const sessionId of wanted) {
      const rem = remaining.get(sessionId) ?? 0
      if (rem > 0) {
        const serial = nextSerial.get(sessionId)!
        assigned = { session: sessionId, serial }
        remaining.set(sessionId, rem - 1)
        nextSerial.set(sessionId, serial + 1)
        break
      }
    }
    results.push({
      registration_id: row.registration.id,
      chinese_name: row.registration.chinese_name,
      member_id: row.registration.member_id,
      mode: 'group',
      status: assigned ? 'won' : 'lost',
      label: assigned ? (SESSION_LABEL[assigned.session] || assigned.session) : '—',
      serial: assigned?.serial ?? null,
      assigned_session: assigned?.session ?? null,
    })
  }

  // Phase 2：候補（lost 的學員依意願順序找第一個有候補名額的場次）
  for (const result of results) {
    if (result.status !== 'lost') continue
    const row = rows.find(r => r.registration.id === result.registration_id)
    if (!row?.interactive) continue
    const wanted = (row.interactive.wanted_sessions || []).filter(s => sessions.find(x => x.id === s))
    for (const sessionId of wanted) {
      const wrem = waitlistRemaining.get(sessionId) ?? 0
      if (wrem > 0) {
        const serial = waitlistNextSerial.get(sessionId)!
        waitlistRemaining.set(sessionId, wrem - 1)
        waitlistNextSerial.set(sessionId, serial + 1)
        result.status = 'waitlist'
        result.label = SESSION_LABEL[sessionId] || sessionId
        result.serial = serial
        result.assigned_session = sessionId
        break
      }
    }
  }

  return results
}

function runSmallGroupDraw(rows: Row[]): DrawResult[] {
  // ── 統計 DB 中已有的中簽與候補記錄 ──
  const alreadyWon = new Map<string, number>()           // per teacher
  const alreadyWaitlist = new Map<string, number>()      // per teacher|date
  const maxSerial = new Map<string, number>()            // per teacher|date（中簽序號）
  const maxWaitlistSerial = new Map<string, number>()    // per teacher|date（候補序號）
  const alreadyWonByDate = new Map<string, number>()     // per teacher|date

  for (const r of rows) {
    const it = r.interactive
    if (!it?.assigned_group) continue
    const tid = it.assigned_group
    const dk = it.assigned_date ? `${tid}|${it.assigned_date}` : null

    if (it.small_status === 'won') {
      alreadyWon.set(tid, (alreadyWon.get(tid) || 0) + 1)
      if (dk) {
        alreadyWonByDate.set(dk, (alreadyWonByDate.get(dk) || 0) + 1)
        if (it.small_serial !== null && it.small_serial !== undefined)
          maxSerial.set(dk, Math.max(maxSerial.get(dk) || 0, it.small_serial))
      }
    } else if (it.small_status === 'waitlist') {
      if (dk) {
        alreadyWaitlist.set(dk, (alreadyWaitlist.get(dk) || 0) + 1)
        if (it.small_serial !== null && it.small_serial !== undefined)
          maxWaitlistSerial.set(dk, Math.max(maxWaitlistSerial.get(dk) || 0, it.small_serial))
      }
    }
  }

  // ── 剩餘名額 ──
  const dateRemaining = new Map<string, number>()       // 中簽名額 per teacher|date
  const waitlistRemaining = new Map<string, number>()   // 候補名額 per teacher|date
  const nextSerial = new Map<string, number>()          // 中簽序號 per teacher|date
  const waitlistNextSerial = new Map<string, number>()  // 候補序號 per teacher|date

  for (const t of TEACHERS) {
    for (const d of SMALL_DATES) {
      const k = `${t.id}|${d.date}`
      dateRemaining.set(k, Math.max(0, d.cap - (alreadyWonByDate.get(k) || 0)))
      waitlistRemaining.set(k, Math.max(0, SMALL_WAITLIST_CAP - (alreadyWaitlist.get(k) || 0)))
      nextSerial.set(k, (maxSerial.get(k) || 0) + 1)
      waitlistNextSerial.set(k, (maxWaitlistSerial.get(k) || 0) + 1)
    }
  }

  const remaining = new Map(TEACHERS.map(t => [t.id, Math.max(0, SMALL_GROUP_CAP - (alreadyWon.get(t.id) || 0))]))

  type PoolEntry = { row: Row; prefIndex: number }
  const resultMap = new Map<string, DrawResult>()

  let pool: PoolEntry[] = rows
    .filter(r => r.interactive && r.interactive.small_status === 'pending' && (r.interactive.wanted_ranking || []).length > 0)
    .map(row => ({ row, prefIndex: 0 }))

  // ── Phase 1：多輪意願抽簽（中簽） ──
  while (pool.length > 0) {
    const byTeacher = new Map<string, PoolEntry[]>()
    for (const entry of pool) {
      const ranking = entry.row.interactive!.wanted_ranking || []
      if (entry.prefIndex >= ranking.length) {
        // 意願用盡 → 暫時標 lost，Phase 2 再嘗試候補
        resultMap.set(entry.row.registration.id, {
          registration_id: entry.row.registration.id,
          chinese_name: entry.row.registration.chinese_name,
          member_id: entry.row.registration.member_id,
          mode: 'small', status: 'lost', label: '—', serial: null, assigned_group: null,
        })
        continue
      }
      const tid = ranking[entry.prefIndex]
      if (!byTeacher.has(tid)) byTeacher.set(tid, [])
      byTeacher.get(tid)!.push(entry)
    }
    if (byTeacher.size === 0) break

    const nextPool: PoolEntry[] = []
    for (const [teacherId, candidates] of byTeacher) {
      const rem = remaining.get(teacherId) ?? 0
      const wonCount = Math.min(rem, candidates.length)
      const shuffled = shuffle(candidates)
      for (let i = 0; i < shuffled.length; i++) {
        const e = shuffled[i]
        if (i < wonCount) {
          // 先選日期，再取該日期序號
          let assignedDate: string | null = null
          let bestRem = -1
          for (const d of SMALL_DATES) {
            const k = `${teacherId}|${d.date}`
            const r = dateRemaining.get(k) ?? 0
            if (r > bestRem) { bestRem = r; assignedDate = d.date }
          }
          if (assignedDate && bestRem > 0) {
            const k = `${teacherId}|${assignedDate}`
            dateRemaining.set(k, bestRem - 1)
            const serial = nextSerial.get(k)!
            nextSerial.set(k, serial + 1)
            resultMap.set(e.row.registration.id, {
              registration_id: e.row.registration.id,
              chinese_name: e.row.registration.chinese_name,
              member_id: e.row.registration.member_id,
              mode: 'small', status: 'won',
              label: TEACHER_LABEL[teacherId] || teacherId,
              serial, assigned_group: teacherId, assigned_date: assignedDate,
            })
          } else {
            // 名額已滿（理論上不應發生），進下一輪
            nextPool.push({ row: e.row, prefIndex: e.prefIndex + 1 })
          }
        } else {
          nextPool.push({ row: e.row, prefIndex: e.prefIndex + 1 })
        }
      }
      remaining.set(teacherId, rem - wonCount)
    }
    pool = nextPool
  }

  // 剩餘（所有老師都滿額）→ 標 lost，Phase 2 再嘗試候補
  for (const entry of pool) {
    if (!resultMap.has(entry.row.registration.id)) {
      resultMap.set(entry.row.registration.id, {
        registration_id: entry.row.registration.id,
        chinese_name: entry.row.registration.chinese_name,
        member_id: entry.row.registration.member_id,
        mode: 'small', status: 'lost', label: '—', serial: null, assigned_group: null,
      })
    }
  }

  // ── Phase 2：候補分配（依意願順序，找第一個有候補名額的老師＋日期） ──
  for (const result of resultMap.values()) {
    if (result.status !== 'lost') continue
    const row = rows.find(r => r.registration.id === result.registration_id)
    if (!row?.interactive) continue
    const ranking = row.interactive.wanted_ranking || []
    let assigned = false
    for (const teacherId of ranking) {
      // 找該老師剩餘候補名額最多的日期
      let bestDate: string | null = null
      let bestRem = 0
      for (const d of SMALL_DATES) {
        const k = `${teacherId}|${d.date}`
        const rem = waitlistRemaining.get(k) ?? 0
        if (rem > bestRem) { bestRem = rem; bestDate = d.date }
      }
      if (bestDate && bestRem > 0) {
        const k = `${teacherId}|${bestDate}`
        waitlistRemaining.set(k, bestRem - 1)
        const serial = waitlistNextSerial.get(k)!
        waitlistNextSerial.set(k, serial + 1)
        result.status = 'waitlist'
        result.label = TEACHER_LABEL[teacherId] || teacherId
        result.serial = serial
        result.assigned_group = teacherId
        result.assigned_date = bestDate
        assigned = true
        break
      }
    }
    if (!assigned) {
      result.label = '—'
      result.serial = null
      result.assigned_group = null
    }
  }

  return Array.from(resultMap.values())
}

function AutoDrawModal({ rows, onClose, onApplied }: {
  rows: Row[]
  onClose: () => void
  onApplied: () => void
}) {
  const [step, setStep] = useState<'config' | 'drawing' | 'results' | 'applying' | 'done'>('config')
  const [mode, setMode] = useState<DrawMode>('group')
  const [scope, setScope] = useState<GroupScope>('all')
  const [results, setResults] = useState<DrawResult[]>([])
  const [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 })
  const [applyError, setApplyError] = useState('')

  const groupEligible = rows.filter(r => {
    const it = r.interactive
    if (!it || it.group_status !== 'pending') return false
    const wanted = it.wanted_sessions || []
    return scope === 'all' ? wanted.length > 0 : wanted.some(s => s === scope)
  }).length

  const smallEligible = rows.filter(r => {
    const it = r.interactive
    return it && it.small_status === 'pending' && (it.wanted_ranking || []).length > 0
  }).length

  const eligible = mode === 'group' ? groupEligible : smallEligible

  const runDraw = async () => {
    setStep('drawing')
    await new Promise(r => setTimeout(r, 1600))
    const res = mode === 'group' ? runGroupDraw(rows, scope) : runSmallGroupDraw(rows)
    setResults(res)
    setStep('results')
  }

  const applyResults = async () => {
    setStep('applying')
    setApplyError('')
    const patches = results.map(r =>
      r.mode === 'group'
        ? { registration_id: r.registration_id, group_status: r.status, assigned_session: r.assigned_session ?? null, group_serial: r.serial }
        : { registration_id: r.registration_id, small_status: r.status, assigned_group: r.assigned_group ?? null, assigned_date: r.assigned_date ?? null, small_serial: r.serial }
    )
    setApplyProgress({ done: 0, total: patches.length })
    try {
      const res = await fetch('/api/admin/interactive/batch-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patches }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '套用失敗')
      setApplyProgress({ done: data.applied, total: patches.length })
      setStep('done')
    } catch (e: any) {
      setApplyError(e.message)
      setStep('results')
    }
  }

  const wonCount = results.filter(r => r.status === 'won').length
  const waitlistCount = results.filter(r => r.status === 'waitlist').length
  const lostCount = results.filter(r => r.status === 'lost').length
  const byLabel = new Map<string, number>()
  for (const r of results) {
    if (r.status === 'won') byLabel.set(r.label, (byLabel.get(r.label) || 0) + 1)
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(30, 26, 20, 0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  }
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-pure)', borderRadius: 18,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    width: '90%', maxWidth: 820, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }

  return (
    <div style={overlayStyle} onClick={step === 'config' ? onClose : undefined}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-noto-serif-tc), serif', fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.06em' }}>
          <span>🎲 自動抽簽</span>
          {(step === 'config' || step === 'results' || step === 'done') && (
            <button onClick={onClose} className="admin-btn-sm">✕</button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {step === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {([
                  { v: 'group' as DrawMode, label: '集體互動', hint: '依學員「想要的集體場次」抽簽' },
                  { v: 'small' as DrawMode, label: '分組互動', hint: '依學員「分組老師排序」抽簽' },
                ]).map(opt => (
                  <label key={opt.v} style={{ flex: 1, cursor: 'pointer', padding: '14px 18px', border: `2px solid ${mode === opt.v ? 'var(--green)' : 'var(--line)'}`, borderRadius: 12, background: mode === opt.v ? 'rgba(73,85,52,0.08)' : 'var(--bg-pure)', transition: 'all 0.15s' }}>
                    <input type="radio" name="draw_mode" value={opt.v} checked={mode === opt.v} onChange={() => setMode(opt.v)} style={{ display: 'none' }} />
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>{opt.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-mute)' }}>{opt.hint}</div>
                  </label>
                ))}
              </div>

              {mode === 'group' && (
                <div>
                  <label className="form-label">抽簽範圍（場次）</label>
                  <select className="form-select" value={scope} onChange={e => setScope(e.target.value)} style={{ maxWidth: 360 }}>
                    <option value="all">全部場次（同時抽）</option>
                    {SESSIONS.map(s => <option key={s.id} value={s.id}>{s.label}（名額 {s.cap}）</option>)}
                  </select>
                </div>
              )}

              <div style={{ padding: '12px 16px', borderRadius: 10, background: eligible > 0 ? 'rgba(73,85,52,0.06)' : 'rgba(180,147,88,0.1)', border: '1px solid var(--line)', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                {eligible > 0
                  ? <>將對 <strong style={{ color: 'var(--ink)', fontSize: 16 }}>{eligible}</strong> 位「已送出且狀態為未定」的學員進行抽簽。已中簽或沒中簽者不受影響。</>
                  : '目前沒有符合條件的學員（已送出且狀態為未定）。'}
              </div>
            </div>
          )}

          {step === 'drawing' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 16, display: 'inline-block', animation: 'spin 0.5s linear infinite' }}>🎲</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.08em', marginBottom: 8 }}>抽簽中⋯</div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>正在依學員偏好隨機分配</div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 'results' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(73,85,52,0.08)', border: '1px solid rgba(73,85,52,0.2)', fontSize: 13 }}>
                  ✓ 中簽 <strong style={{ fontSize: 18, color: 'var(--green-deep)' }}>{wonCount}</strong> 人
                </div>
                {mode === 'small' && (
                  <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(42,111,168,0.08)', border: '1px solid rgba(42,111,168,0.2)', fontSize: 13 }}>
                    ✦ 候補 <strong style={{ fontSize: 18, color: '#2a6fa8' }}>{waitlistCount}</strong> 人
                  </div>
                )}
                <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(180,147,88,0.08)', border: '1px solid rgba(180,147,88,0.2)', fontSize: 13 }}>
                  ✗ 沒中簽 <strong style={{ fontSize: 18, color: 'var(--gold-deep)' }}>{lostCount}</strong> 人
                </div>
                {Array.from(byLabel.entries()).map(([label, cnt]) => (
                  <div key={label} style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(251,248,242,0.9)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    {label}：{cnt} 人
                  </div>
                ))}
              </div>

              {applyError && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 8, color: 'var(--error)', fontSize: 13 }}>
                  {applyError}
                </div>
              )}

              <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(73,85,52,0.07)' }}>
                      {['姓名', '報名序號', '結果', mode === 'group' ? '指定場次' : '指定分組', mode === 'small' ? '指定日期' : null, '序號'].filter(Boolean).map(h => (
                        <th key={h!} style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--ink)', textAlign: 'left', borderBottom: '1px solid var(--line-strong)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => {
                      const isWon = r.status === 'won'
                      const isWaitlist = r.status === 'waitlist'
                      const rowBg = isWon ? 'rgba(73,85,52,0.03)' : isWaitlist ? 'rgba(42,111,168,0.03)' : 'transparent'
                      const statusBadge = isWon
                        ? { bg: 'rgba(73,85,52,0.12)', color: 'var(--green-deep)', border: 'rgba(73,85,52,0.25)', text: '✓ 中簽' }
                        : isWaitlist
                          ? { bg: 'rgba(42,111,168,0.10)', color: '#2a6fa8', border: 'rgba(42,111,168,0.25)', text: '✦ 候補' }
                          : { bg: 'rgba(180,147,88,0.1)', color: 'var(--gold-deep)', border: 'rgba(180,147,88,0.25)', text: '✗ 沒中簽' }
                      const hasAssign = isWon || isWaitlist
                      return (
                        <tr key={r.registration_id} style={{ background: rowBg, borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '7px 12px', fontWeight: 600 }}>{r.chinese_name}</td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--ink-mute)' }}>{r.member_id || '—'}</td>
                          <td style={{ padding: '7px 12px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}>
                              {statusBadge.text}
                            </span>
                          </td>
                          <td style={{ padding: '7px 12px', color: hasAssign ? 'var(--ink)' : 'var(--ink-mute)', fontSize: 12.5 }}>{hasAssign ? r.label : '—'}</td>
                          {mode === 'small' && (
                            <td style={{ padding: '7px 12px', color: hasAssign ? 'var(--ink)' : 'var(--ink-mute)', fontSize: 12.5 }}>
                              {hasAssign ? (r.assigned_date || <span style={{ color: 'var(--error)' }}>未能分配</span>) : '—'}
                            </td>
                          )}
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: hasAssign ? 700 : 400, color: hasAssign ? 'var(--ink)' : 'var(--ink-mute)' }}>{r.serial ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 10 }}>
                套用後可透過「編輯指定」修改個別結果。
              </p>
            </div>
          )}

          {step === 'applying' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>套用中⋯</div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>正在寫入 {results.length} 筆資料</div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-deep)', letterSpacing: '0.08em', marginBottom: 8 }}>套用完成！</div>
              <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>已更新 {applyProgress.done} 筆學員資料</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'rgba(251,248,242,0.8)' }}>
          {step === 'config' && (
            <>
              <button onClick={onClose} className="admin-btn-sm">取消</button>
              <button onClick={runDraw} disabled={eligible === 0} className="admin-btn-sm primary" style={{ fontWeight: 700 }}>
                🎲 開始抽簽
              </button>
            </>
          )}
          {step === 'results' && (
            <>
              <button onClick={onClose} className="admin-btn-sm">取消</button>
              <button onClick={() => setStep('config')} className="admin-btn-sm">重新設定</button>
              <button onClick={runDraw} className="admin-btn-sm" style={{ borderColor: 'var(--gold-deep)', color: 'var(--gold-deep)' }}>
                🔄 重新抽簽
              </button>
              <button onClick={applyResults} className="admin-btn-sm primary" style={{ fontWeight: 700 }}>
                ✓ 確定套用到資料庫
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onApplied} className="admin-btn-sm primary">關閉並重新整理</button>
          )}
        </div>
      </div>
    </div>
  )
}
