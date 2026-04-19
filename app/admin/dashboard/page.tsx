'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const RESIDENCE_OPTIONS = ['台灣','中國大陸/內地','香港','澳門','馬來西亞','泰國','日本','美國','加拿大','新加坡','英國','斯里蘭卡','其他地區']
const PLAN_OPTIONS: [string, string][] = [
  ['A1', 'A(1) 8/20-8/24 食宿等費用（匯款）'],
  ['A2', 'A(2) 8/20-8/24 食宿等費用（刷卡）'],
  ['B1', 'B(1) 8/19-8/24 食宿費用（匯款）'],
  ['B2', 'B(2) 8/19-8/24 食宿費用（刷卡）'],
  ['C1', 'C(1) 8/19+8/25 食宿等費用（匯款）'],
  ['C2', 'C(2) 8/19+8/25 食宿等費用（刷卡）'],
  ['D1', 'D(1) 8/20-8/25 食宿等費用（匯款）'],
  ['D2', 'D(2) 8/20-8/25 食宿等費用（刷卡）'],
  ['T1', '【測試】匯款 1 元'],
  ['T2', '【測試】刷卡 30 元'],
]

export default function DashboardPage() {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [qrPreview, setQrPreview] = useState<{ url: string; title: string } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [detailReg, setDetailReg] = useState<any | null>(null)
  const [editReg, setEditReg] = useState<any | null>(null)

  // 點 row 外面關閉下拉
  useEffect(() => {
    if (!openMenuId) return
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-row-menu]')) setOpenMenuId(null)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editUploading, setEditUploading] = useState<'line' | 'wechat' | null>(null)

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
          residence: editReg.residence,
          member_id: editReg.member_id || null,
          payment_plan: editReg.payment_plan ?? null,
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

  const planLabel = (p: string | null | undefined) => {
    if (!p) return '—'
    const map: Record<string, string> = {
      A1: 'A(1) 8/20-8/24 食宿等費用（匯款）',
      A2: 'A(2) 8/20-8/24 食宿等費用（刷卡）',
      B1: 'B(1) 8/19-8/24 食宿費用（匯款）',
      B2: 'B(2) 8/19-8/24 食宿費用（刷卡）',
      C1: 'C(1) 8/19+8/25 食宿等費用（匯款）',
      C2: 'C(2) 8/19+8/25 食宿等費用（刷卡）',
      D1: 'D(1) 8/20-8/25 食宿等費用（匯款）',
      D2: 'D(2) 8/20-8/25 食宿等費用（刷卡）',
      T1: '【測試】匯款 1 元',
      T2: '【測試】刷卡 30 元',
    }
    return map[p] || p
  }

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/registrations?${params}`)
    const data = await res.json()
    if (res.status === 401) {
      router.push('/admin')
      return
    }
    setRegistrations(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [statusFilter])

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchData()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selected.length === registrations.length) {
      setSelected([])
    } else {
      setSelected(registrations.map(r => r.id))
    }
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

  const updatePayment = async (id: string, payment_status: string) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, payment_status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage(`繳費狀態更新失敗：${data.error || res.status}`)
      return
    }
    setMessage('')
    fetchData()
  }

  const batchAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selected.length === 0) {
      setMessage('請先勾選項目')
      return
    }
    const verb = action === 'approve' ? '錄取' : action === 'reject' ? '拒絕' : '刪除'
    const destructive = action === 'delete'
    if (!confirm(
      `確定要批次${verb} ${selected.length} 筆嗎？` +
      (destructive ? '\n\n此操作無法復原，會連同 QR 圖檔一併清除。' : '')
    )) return

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

  const sendNotifications = async () => {
    const approvedSelected = registrations
      .filter(r => selected.includes(r.id) && r.status === 'approved')
      .map(r => r.id)

    if (approvedSelected.length === 0) {
      setMessage('請先選取已審核通過的學員')
      return
    }

    setSending(true)
    const res = await fetch('/api/admin/send-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: approvedSelected }),
    })
    const data = await res.json()
    setMessage(data.message)
    setSending(false)
  }

  const deleteRegistration = async (reg: any) => {
    const confirmed = window.confirm(
      `確定要刪除這筆報名嗎？\n\n姓名：${reg.chinese_name}\nEmail：${reg.email}\n繳費碼：${reg.random_code}\n\n此操作無法復原，包含 QR 圖檔也會一併刪除。`
    )
    if (!confirmed) return
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

  // 計算下一個可用學號（所有現有 XXX-T 最大號 + 1）
  const nextAvailableMemberId = () => {
    let maxN = 0
    for (const r of registrations) {
      const m = r.member_id?.match(/^(\d+)-T$/)
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
    }
    return `${String(maxN + 1).padStart(3, '0')}-T`
  }

  const assignMemberId = async (id: string) => {
    const member_id = nextAvailableMemberId()
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, member_id }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMessage(`編號失敗：${d.error || res.status}`)
      return
    }
    setMessage(`已編號 ${member_id}`)
    fetchData()
  }

  const clearMemberId = async (reg: any) => {
    if (!confirm(`確定清除（註銷）${reg.chinese_name} 的學號「${reg.member_id}」？\n清除後此號碼若無其他人使用，可重新分配給其他學員。`)) return
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reg.id, member_id: null }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMessage(`清除失敗：${d.error || res.status}`)
      return
    }
    setMessage(`已清除 ${reg.chinese_name} 的學號`)
    fetchData()
  }

  const reassignMemberId = async (reg: any) => {
    const next = nextAvailableMemberId()
    if (!confirm(`將 ${reg.chinese_name} 的學號由「${reg.member_id || '無'}」改為「${next}」？`)) return
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reg.id, member_id: next }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMessage(`重新分配失敗：${d.error || res.status}`)
      return
    }
    setMessage(`已重新分配 ${reg.chinese_name} 的學號為 ${next}`)
    fetchData()
  }

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    paid: registrations.filter(r => r.payment_status === 'verified').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* 統計卡片 */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: '總報名', value: stats.total, color: 'bg-white' },
            { label: '審核中', value: stats.pending, color: 'bg-yellow-50' },
            { label: '已錄取', value: stats.approved, color: 'bg-green-50' },
            { label: '未錄取', value: stats.rejected, color: 'bg-red-50' },
            { label: '已繳費', value: stats.paid, color: 'bg-blue-50' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-xl border border-gray-100 p-4 text-center`}>
              <div className="text-3xl font-bold text-green-800">{value}</div>
              <div className="text-sm text-black mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* 操作列 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
          <input
            className="border border-gray-300 rounded-lg px-4 py-2 text-black w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="搜尋姓名、Email、繳費碼..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
          <select
            className="border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-green-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">全部狀態</option>
            <option value="pending">審核中</option>
            <option value="approved">已錄取</option>
            <option value="rejected">未錄取</option>
          </select>
          <button
            onClick={fetchData}
            className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-sm">
            重新整理
          </button>
          <button
            onClick={() => window.open('/api/admin/export', '_blank')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            匯出 CSV
          </button>
          <button
            onClick={() => batchAction('approve')}
            disabled={sending || selected.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm">
            批次錄取 ({selected.length})
          </button>
          <button
            onClick={() => batchAction('reject')}
            disabled={sending || selected.length === 0}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm">
            批次拒絕 ({selected.length})
          </button>
          <button
            onClick={() => batchAction('delete')}
            disabled={sending || selected.length === 0}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm">
            批次刪除 ({selected.length})
          </button>
          <button
            onClick={sendNotifications}
            disabled={sending || selected.length === 0}
            className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm">
            {sending ? '寄送中...' : `再寄錄取信 (${selected.length})`}
          </button>
          {message && (
            <span className="text-sm text-green-700 font-medium">{message}</span>
          )}
        </div>

        {/* 資料表格 */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox"
                      checked={selected.length === registrations.length && registrations.length > 0}
                      onChange={selectAll} />
                  </th>
                  <th className="px-4 py-3 text-left text-black font-medium">報名時間</th>
                  <th className="px-4 py-3 text-left text-black font-medium">姓名</th>
                  <th className="px-4 py-3 text-left text-black font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-black font-medium">居住地</th>
                  <th className="px-4 py-3 text-left text-black font-medium">繳費碼</th>
                  <th className="px-4 py-3 text-left text-black font-medium">審核狀態</th>
                  <th className="px-4 py-3 text-left text-black font-medium">繳費狀態</th>
                  <th className="px-4 py-3 text-left text-black font-medium">學號</th>
                  <th className="px-4 py-3 text-left text-black font-medium">方案</th>
                  <th className="px-4 py-3 text-left text-black font-medium">QR</th>
                  <th className="px-4 py-3 text-left text-black font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-black">載入中...</td></tr>
                ) : registrations.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-black">尚無資料</td></tr>
                ) : registrations.map((reg, index) => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox"
                        checked={selected.includes(reg.id)}
                        onChange={() => toggleSelect(reg.id)} />
                    </td>
                    <td className="px-4 py-3 text-black">
                      {new Date(reg.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-4 py-3 font-medium text-black">{reg.chinese_name}</td>
                    <td className="px-4 py-3 text-black">{reg.email}</td>
                    <td className="px-4 py-3 text-black">{reg.residence}</td>
                    <td className="px-4 py-3 font-mono text-black">{reg.random_code}</td>
                    <td className="px-4 py-3">
                      <select value={reg.status}
                        onChange={e => updateStatus(reg.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${
                          reg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          reg.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        <option value="pending">審核中</option>
                        <option value="approved">已錄取</option>
                        <option value="rejected">未錄取</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={reg.payment_status}
                        onChange={e => updatePayment(reg.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${
                          reg.payment_status === 'unpaid' ? 'bg-gray-100 text-gray-800' :
                          reg.payment_status === 'paid' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                        <option value="unpaid">未繳費</option>
                        <option value="paid">待確認</option>
                        <option value="verified">已確認</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-black">{reg.member_id || '-'}</td>
                    <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{planLabel(reg.payment_plan)}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const qrUrl = reg.line_qr_url || reg.wechat_qr_url
                        const qrLabel = reg.line_qr_url ? 'LINE' : reg.wechat_qr_url ? 'WeChat' : null
                        if (!qrUrl) return <span className="text-gray-400">—</span>
                        return (
                          <button
                            onClick={() => setQrPreview({ url: qrUrl, title: `${reg.chinese_name} - ${qrLabel} QR` })}
                            title="點擊放大"
                            className="block">
                            <img src={qrUrl} alt={qrLabel || 'QR'}
                              className="w-12 h-12 object-cover rounded border border-gray-200 hover:border-green-500 transition-colors" />
                          </button>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 relative" data-row-menu>
                      <div className="flex gap-1">
                        <button onClick={() => setDetailReg(reg)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                          詳細
                        </button>
                        <button onClick={() => { setEditReg({ ...reg }); setEditError('') }}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                          編輯
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === reg.id ? null : reg.id) }}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs"
                          title="更多操作">
                          ⋯
                        </button>
                      </div>
                      {openMenuId === reg.id && (
                        <div className="absolute right-2 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px] py-1">
                          {!reg.member_id && reg.payment_status === 'verified' && (
                            <button onClick={() => { setOpenMenuId(null); assignMemberId(reg.id) }}
                              className="w-full text-left px-3 py-2 text-xs text-purple-800 hover:bg-purple-50">
                              🔢 編號
                            </button>
                          )}
                          {reg.member_id && (
                            <>
                              <button onClick={() => { setOpenMenuId(null); reassignMemberId(reg) }}
                                className="w-full text-left px-3 py-2 text-xs text-purple-800 hover:bg-purple-50">
                                🔄 重新編號
                              </button>
                              <button onClick={() => { setOpenMenuId(null); clearMemberId(reg) }}
                                className="w-full text-left px-3 py-2 text-xs text-orange-800 hover:bg-orange-50">
                                ⛔ 註銷學號
                              </button>
                            </>
                          )}
                          <div className="border-t border-gray-100 my-1" />
                          <button onClick={() => { setOpenMenuId(null); deleteRegistration(reg) }}
                            className="w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50">
                            🗑️ 刪除報名
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editReg && (
        <div onClick={() => !editSaving && setEditReg(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-black text-lg">編輯報名：{editReg.chinese_name}</h3>
              <button onClick={() => !editSaving && setEditReg(null)}
                className="text-gray-500 hover:text-black text-xl leading-none">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-black font-medium mb-1">姓名 *</label>
                <input className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  value={editReg.chinese_name || ''}
                  onChange={e => setEditReg({ ...editReg, chinese_name: e.target.value })} />
              </div>

              <div>
                <label className="block text-black font-medium mb-1">Email *</label>
                <input type="email" className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  value={editReg.email || ''}
                  onChange={e => setEditReg({ ...editReg, email: e.target.value })} />
              </div>

              <div>
                <label className="block text-black font-medium mb-1">居住地</label>
                <select className="w-full border border-gray-300 rounded px-3 py-2 text-black bg-white"
                  value={editReg.residence || ''}
                  onChange={e => setEditReg({ ...editReg, residence: e.target.value })}>
                  <option value="">請選擇</option>
                  {RESIDENCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-black font-medium mb-1">學號</label>
                <input className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  placeholder="例：001-T"
                  value={editReg.member_id || ''}
                  onChange={e => setEditReg({ ...editReg, member_id: e.target.value })} />
              </div>

              <div>
                <label className="block text-black font-medium mb-1">食宿方案</label>
                <select className="w-full border border-gray-300 rounded px-3 py-2 text-black bg-white"
                  value={editReg.payment_plan || ''}
                  onChange={e => setEditReg({ ...editReg, payment_plan: e.target.value })}>
                  <option value="">（未選擇）</option>
                  {PLAN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-black font-medium mb-1">LINE QR</label>
                {editReg.line_qr_url && (
                  <img src={editReg.line_qr_url} alt="LINE QR"
                    className="w-24 h-24 object-contain border rounded mb-2" />
                )}
                <input type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={editUploading === 'line'}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleEditQrUpload('line', f) }} />
                {editUploading === 'line' && <p className="text-xs text-gray-500 mt-1">上傳中...</p>}
                {editReg.line_qr_url && (
                  <button onClick={() => setEditReg({ ...editReg, line_qr_url: null })}
                    className="mt-1 text-xs text-red-600 hover:underline">清除</button>
                )}
              </div>

              <div>
                <label className="block text-black font-medium mb-1">WeChat QR</label>
                {editReg.wechat_qr_url && (
                  <img src={editReg.wechat_qr_url} alt="WeChat QR"
                    className="w-24 h-24 object-contain border rounded mb-2" />
                )}
                <input type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={editUploading === 'wechat'}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleEditQrUpload('wechat', f) }} />
                {editUploading === 'wechat' && <p className="text-xs text-gray-500 mt-1">上傳中...</p>}
                {editReg.wechat_qr_url && (
                  <button onClick={() => setEditReg({ ...editReg, wechat_qr_url: null })}
                    className="mt-1 text-xs text-red-600 hover:underline">清除</button>
                )}
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
                  {editError}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button onClick={() => !editSaving && setEditReg(null)}
                disabled={editSaving}
                className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm">
                取消
              </button>
              <button onClick={saveEdit}
                disabled={editSaving || !!editUploading}
                className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm">
                {editSaving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailReg && (
        <div onClick={() => setDetailReg(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-black text-lg">{detailReg.chinese_name}　學員詳細資料</h3>
              <button onClick={() => setDetailReg(null)}
                className="text-gray-500 hover:text-black text-xl">✕</button>
            </div>

            <h4 className="font-semibold text-green-800 mb-2 mt-2">基本資料</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailField label="中文姓名" value={detailReg.chinese_name} />
              <DetailField label="護照英文姓名" value={detailReg.passport_name} />
              <DetailField label="繳費碼" value={detailReg.random_code} mono />
              <DetailField label="學號" value={detailReg.member_id} />
              <DetailField label="身分" value={detailReg.identity === 'lay' ? '在家人' : detailReg.identity === 'monastic' ? '僧眾' : detailReg.identity} />
              <DetailField label="法名" value={detailReg.dharma_name} />
              <DetailField label="性別" value={detailReg.gender === 'male' ? '男' : detailReg.gender === 'female' ? '女' : detailReg.gender} />
              <DetailField label="年齡" value={detailReg.age} />
              <DetailField label="居住地" value={detailReg.residence} />
              <DetailField label="護照頒發地" value={detailReg.passport_country} />
              <DetailField label="手機" value={detailReg.phone} />
              <DetailField label="Email" value={detailReg.email} />
              <DetailField label="報名時間" value={detailReg.created_at ? new Date(detailReg.created_at).toLocaleString('zh-TW') : '—'} />
            </div>

            <h4 className="font-semibold text-green-800 mb-2 mt-5">通訊軟體</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailField label="LINE ID" value={detailReg.line_id} />
              <DetailField label="WeChat ID" value={detailReg.wechat_id} />
            </div>
            <div className="flex gap-3 mt-2">
              {detailReg.line_qr_url && (
                <button onClick={() => setQrPreview({ url: detailReg.line_qr_url, title: `${detailReg.chinese_name} - LINE QR` })}>
                  <img src={detailReg.line_qr_url} alt="LINE QR" className="w-20 h-20 object-cover border rounded" />
                  <p className="text-xs text-black mt-1">LINE</p>
                </button>
              )}
              {detailReg.wechat_qr_url && (
                <button onClick={() => setQrPreview({ url: detailReg.wechat_qr_url, title: `${detailReg.chinese_name} - WeChat QR` })}>
                  <img src={detailReg.wechat_qr_url} alt="WeChat QR" className="w-20 h-20 object-cover border rounded" />
                  <p className="text-xs text-black mt-1">WeChat</p>
                </button>
              )}
            </div>

            <h4 className="font-semibold text-green-800 mb-2 mt-5">報名條件</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailField label="承諾如實填寫" value={yn(detailReg.honest_confirm)} />
              <DetailField label="正式學員經驗" value={yn(detailReg.attended_formal)} />
              <DetailField label="觀看 3 屆錄影" value={yn(detailReg.watched_recordings)} />
              <DetailField label="ZOOM 一對一指導" value={yn(detailReg.zoom_guidance)} />
              <DetailField label="法談 30 篇以上" value={yn(detailReg.watched_30_talks)} />
              <DetailField label="持守五戒" value={yn(detailReg.keep_precepts)} />
              <DetailField label="同意繳費" value={yn(detailReg.pay_confirm)} />
              <DetailField label="身體健康" value={yn(detailReg.health_confirm)} />
              <DetailField label="修習年資" value={detailReg.practice_years} />
              <DetailField label="練習頻率" value={detailReg.practice_frequency} />
            </div>
            {detailReg.mental_health_note && (
              <div className="mt-2">
                <div className="text-xs text-gray-500">心理健康備註</div>
                <div className="text-black text-sm bg-gray-50 rounded p-2">{detailReg.mental_health_note}</div>
              </div>
            )}

            {Array.isArray(detailReg.attended_courses) && detailReg.attended_courses.length > 0 && (
              <>
                <h4 className="font-semibold text-green-800 mb-2 mt-5">過往參加課程</h4>
                <ul className="text-sm text-black list-disc pl-6">
                  {detailReg.attended_courses.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </>
            )}

            <h4 className="font-semibold text-green-800 mb-2 mt-5">狀態 / 繳費</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailField label="審核狀態" value={({ pending: '審核中', approved: '已錄取', rejected: '未錄取' } as Record<string, string>)[detailReg.status] || detailReg.status} />
              <DetailField label="繳費狀態" value={({ unpaid: '未繳費', paid: '已回報待確認', verified: '已確認繳費' } as Record<string, string>)[detailReg.payment_status] || detailReg.payment_status} />
              <DetailField label="繳費方案" value={detailReg.payment_plan} />
              <DetailField label="繳費確認時間" value={detailReg.payment_confirmed_at ? new Date(detailReg.payment_confirmed_at).toLocaleString('zh-TW') : '—'} />
            </div>
            {detailReg.payment_note && (
              <div className="mt-2">
                <div className="text-xs text-gray-500">繳費備註</div>
                <div className="text-black text-xs bg-gray-50 rounded p-2 break-all">{detailReg.payment_note}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {qrPreview && (
        <div onClick={() => setQrPreview(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-black">{qrPreview.title}</h3>
              <button onClick={() => setQrPreview(null)}
                className="text-gray-500 hover:text-black text-xl leading-none">✕</button>
            </div>
            <img src={qrPreview.url} alt="QR"
              className="w-full rounded border border-gray-200" />
            <div className="mt-4 flex gap-2 justify-end">
              <a href={qrPreview.url} target="_blank" rel="noreferrer"
                className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-sm">
                新分頁開啟
              </a>
              <a href={qrPreview.url} download
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm">
                下載
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-black ${mono ? 'font-mono' : ''}`}>{value || value === 0 ? value : '—'}</div>
    </div>
  )
}

function yn(v: boolean | null | undefined) {
  if (v === true) return '是'
  if (v === false) return '否'
  return '—'
}