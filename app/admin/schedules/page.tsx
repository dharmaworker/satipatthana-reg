'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

type Schedule = {
  id: string
  scheduled_at: string
  recipients: string[]
  enabled: boolean
  last_run_at: string | null
  last_error: string | null
  created_at: string
}

export default function SchedulesPage() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editItem, setEditItem] = useState<Partial<Schedule> | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/schedules')
    if (res.status === 401 || res.status === 403) {
      router.push('/admin')
      return
    }
    const data = await res.json()
    setSchedules(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const toggleEnabled = async (s: Schedule) => {
    await fetch('/api/admin/schedules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    })
    fetchData()
  }

  const deleteSchedule = async (s: Schedule) => {
    if (!confirm(`確定刪除排程 ${toLocal(s.scheduled_at)}？`)) return
    await fetch('/api/admin/schedules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id }),
    })
    fetchData()
  }

  const saveEdit = async () => {
    if (!editItem) return
    setMessage('')
    const body: any = {
      scheduled_at: editItem.scheduled_at,
      recipients: typeof editItem.recipients === 'string'
        ? (editItem.recipients as unknown as string).split(/[,，;]/).map(x => x.trim()).filter(Boolean)
        : editItem.recipients,
      enabled: editItem.enabled ?? true,
    }
    const isNew = !editItem.id
    const res = await fetch('/api/admin/schedules', {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isNew ? body : { ...body, id: editItem.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error || '儲存失敗')
      return
    }
    setEditItem(null)
    fetchData()
  }

  const runNow = async () => {
    if (!confirm('立即執行所有「已到期但尚未執行」的排程？（通常給 cron 使用，你現在是手動觸發）')) return
    setMessage('執行中⋯')
    const res = await fetch('/api/admin/cron/run-exports', { method: 'POST' })
    const data = await res.json()
    setMessage(res.ok ? `執行完成：處理 ${data.processed} 筆` : (data.error || '失敗'))
    fetchData()
  }

  return (
    <div className="admin-page">
      <AdminHeader />

      <div className="admin-main" style={{ maxWidth: 1100 }}>
        <div className="admin-info-strip">
          <p>⚙ 系統每天台灣時間 00:00 自動檢查並執行到期的排程。</p>
          <p>📎 Excel 含：全部 / 待審核 / 已錄取未繳費 / 已繳費 / 未錄取 五個工作表。</p>
          <p>⏰ 資料截止時間 = 排程日期的前一日 24:00（台灣時間）。最多 10 筆排程。</p>
        </div>

        <div className="admin-toolbar">
          <button onClick={() => setEditItem({ scheduled_at: '', recipients: [], enabled: true })}
            disabled={schedules.length >= 10}
            className="admin-btn-sm primary">
            + 新增排程
          </button>
          <button onClick={runNow} className="admin-btn-sm gold">
            立即執行（手動觸發）
          </button>
          {message && (
            <span style={{ fontSize: 13, color: 'var(--green-deep)', fontWeight: 600 }}>
              {message}
            </span>
          )}
          <span className="count">共 {schedules.length} ／ 10 筆</span>
        </div>

        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>排程日期（台北）</th>
                <th>收件人</th>
                <th>啟用</th>
                <th>上次執行</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>載入中⋯</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>尚無排程</td></tr>
              ) : schedules.map(s => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{toLocalDate(s.scheduled_at)}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{s.recipients.join(', ')}</td>
                  <td>
                    <button onClick={() => toggleEnabled(s)}
                      className={`admin-status-badge ${s.enabled ? 'ok' : 'muted'}`}
                      style={{ cursor: 'pointer', border: 'none' }}>
                      {s.enabled ? '啟用' : '停用'}
                    </button>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {s.last_run_at ? toLocal(s.last_run_at) : '—'}
                    {s.last_error && <div style={{ color: 'var(--error)', marginTop: 4 }}>錯誤：{s.last_error}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditItem({ ...s, recipients: s.recipients as any })}
                        className="admin-btn-sm">編輯</button>
                      <button onClick={() => deleteSchedule(s)}
                        className="admin-btn-sm danger">刪除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editItem && (
        <div onClick={() => setEditItem(null)} className="admin-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="admin-modal-card" style={{ maxWidth: 460 }}>
            <h3>
              <span>{editItem.id ? '編輯排程' : '新增排程'}</span>
              <button onClick={() => setEditItem(null)} className="admin-btn-sm">✕</button>
            </h3>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="form-label">排程日期（台北時間）<span className="required">*</span></label>
                <input type="date" className="form-input"
                  value={toInputDate(editItem.scheduled_at)}
                  onChange={e => setEditItem({ ...editItem, scheduled_at: fromInputDate(e.target.value) })} />
                <p className="form-hint">系統固定於當天台北時間 00:00 寄出，資料截止前一日 24:00</p>
              </div>
              <div>
                <label className="form-label">收件人 Email <span className="required">*</span></label>
                <textarea className="form-textarea" rows={3}
                  placeholder="多個請用逗號或換行分隔&#10;例如：satipatthana.taipei@gmail.com, foo@bar.com"
                  value={Array.isArray(editItem.recipients) ? editItem.recipients.join(', ') : (editItem.recipients as any) || ''}
                  onChange={e => setEditItem({ ...editItem, recipients: e.target.value as any })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={editItem.enabled ?? true}
                  onChange={e => setEditItem({ ...editItem, enabled: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--green)' }} />
                啟用
              </label>
              {message && (
                <div style={{ background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 8, padding: 10, color: 'var(--error)', fontSize: 12.5 }}>
                  {message}
                </div>
              )}
            </div>

            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditItem(null)} className="admin-btn-sm">取消</button>
              <button onClick={saveEdit} className="admin-btn-sm primary">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function toLocal(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
}

function toLocalDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
}

function toInputDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function fromInputDate(dateStr: string) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 0, 0) - 8 * 60 * 60 * 1000)
  return utc.toISOString()
}
