'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

  const assignMemberId = async (id: string, sequence: number) => {
    const member_id = `TW2026-${String(sequence).padStart(3, '0')}`
    await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, member_id }),
    })
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
      {/* Header */}
      <div className="bg-green-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">後台管理系統｜第二屆台灣四念處禪修</h1>
        <button
          onClick={() => router.push('/admin')}
          className="text-green-200 hover:text-white text-sm">
          登出
        </button>
      </div>

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
            onClick={sendNotifications}
            disabled={sending || selected.length === 0}
            className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm">
            {sending ? '寄送中...' : `批次寄送錄取通知 (${selected.length})`}
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
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {reg.payment_status === 'verified' && !reg.member_id && (
                          <button onClick={() => assignMemberId(reg.id, index + 1)}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs">
                            編號
                          </button>
                        )}
                        <button onClick={() => deleteRegistration(reg)}
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
      </div>

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