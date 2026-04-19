'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
    setMessage('執行中...')
    const res = await fetch('/api/admin/cron/run-exports', { method: 'POST' })
    const data = await res.json()
    setMessage(res.ok ? `執行完成：處理 ${data.processed} 筆` : (data.error || '失敗'))
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">自動匯出排程</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/admin/dashboard')}
            className="text-green-200 hover:text-white text-sm">
            ← 返回 Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-1">
          <p>⚙️ 系統每天台灣時間早上 9:00 自動檢查並執行到期的排程。</p>
          <p>📎 Excel 含：全部 / 待審核 / 已錄取未繳費 / 已繳費 / 未錄取 五個工作表。</p>
          <p>⏰ 資料截止時間 = 排程日期的前一日 24:00（台灣時間）。</p>
          <p>🔢 最多 10 筆排程。</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setEditItem({ scheduled_at: '', recipients: [], enabled: true })}
            disabled={schedules.length >= 10}
            className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm">
            + 新增排程
          </button>
          <button onClick={runNow}
            className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-sm">
            立即執行（手動觸發）
          </button>
          {message && <span className="text-sm text-green-700 font-medium self-center">{message}</span>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-black font-medium">排程時間（台北）</th>
                <th className="px-4 py-3 text-left text-black font-medium">收件人</th>
                <th className="px-4 py-3 text-left text-black font-medium">啟用</th>
                <th className="px-4 py-3 text-left text-black font-medium">上次執行</th>
                <th className="px-4 py-3 text-left text-black font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-black">載入中...</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-black">尚無排程</td></tr>
              ) : schedules.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-black">{toLocal(s.scheduled_at)}</td>
                  <td className="px-4 py-3 text-black text-xs">{s.recipients.join(', ')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleEnabled(s)}
                      className={`px-2 py-1 rounded text-xs ${s.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {s.enabled ? '啟用' : '停用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-black text-xs">
                    {s.last_run_at ? toLocal(s.last_run_at) : '—'}
                    {s.last_error && <div className="text-red-600 mt-1">錯誤：{s.last_error}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditItem({ ...s, recipients: s.recipients as any })}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                        編輯
                      </button>
                      <button onClick={() => deleteSchedule(s)}
                        className="bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded text-xs">
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editItem && (
        <div onClick={() => setEditItem(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-black text-lg mb-4">
              {editItem.id ? '編輯排程' : '新增排程'}
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-black font-medium mb-1">排程日期時間（台北時間）*</label>
                <input type="datetime-local"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  value={toInputLocal(editItem.scheduled_at)}
                  onChange={e => setEditItem({ ...editItem, scheduled_at: fromInputLocal(e.target.value) })} />
                <p className="text-xs text-gray-500 mt-1">系統會在此時間之後最近一次 cron (每天 09:00) 執行</p>
              </div>
              <div>
                <label className="block text-black font-medium mb-1">收件人 Email *</label>
                <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  rows={3}
                  placeholder="多個請用逗號或換行分隔&#10;例如：satipatthana.taipei@gmail.com, foo@bar.com"
                  value={Array.isArray(editItem.recipients) ? editItem.recipients.join(', ') : (editItem.recipients as any) || ''}
                  onChange={e => setEditItem({ ...editItem, recipients: e.target.value as any })} />
              </div>
              <label className="flex items-center gap-2 text-black">
                <input type="checkbox"
                  checked={editItem.enabled ?? true}
                  onChange={e => setEditItem({ ...editItem, enabled: e.target.checked })} />
                啟用
              </label>
              {message && <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-xs">{message}</div>}
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button onClick={() => setEditItem(null)}
                className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm">
                取消
              </button>
              <button onClick={saveEdit}
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded text-sm">
                儲存
              </button>
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

function toInputLocal(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  // 轉成台北時區的 yyyy-MM-ddTHH:mm
  const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return tw.toISOString().slice(0, 16)
}

function fromInputLocal(localStr: string) {
  if (!localStr) return ''
  // 使用者輸入的是「台北時間」，減 8 小時轉成 UTC ISO
  const [date, time] = localStr.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, hh, mm) - 8 * 60 * 60 * 1000)
  return utc.toISOString()
}
