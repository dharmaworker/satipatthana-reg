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
    await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchData()
  }

  const updatePayment = async (id: string, payment_status: string) => {
    await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, payment_status }),
    })
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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    const label: Record<string, string> = {
      pending: '審核中',
      approved: '已錄取',
      rejected: '未錄取',
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status]}`}>{label[status]}</span>
  }

  const paymentBadge = (status: string) => {
    const map: Record<string, string> = {
      unpaid: 'bg-gray-100 text-gray-800',
      paid: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
    }
    const label: Record<string, string> = {
      unpaid: '未繳費',
      paid: '待確認',
      verified: '已確認',
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status]}`}>{label[status]}</span>
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
                  <th className="px-4 py-3 text-left text-black font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-black">載入中...</td></tr>
                ) : registrations.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-black">尚無資料</td></tr>
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
                    <td className="px-4 py-3">{statusBadge(reg.status)}</td>
                    <td className="px-4 py-3">{paymentBadge(reg.payment_status)}</td>
                    <td className="px-4 py-3 text-black">{reg.member_id || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {reg.status === 'pending' && (<>
                          <button onClick={() => updateStatus(reg.id, 'approved')}
                            className="bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                            錄取
                          </button>
                          <button onClick={() => updateStatus(reg.id, 'rejected')}
                            className="bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded text-xs">
                            拒絕
                          </button>
                        </>)}
                        {reg.status === 'approved' && reg.payment_status === 'paid' && (
                          <button onClick={() => updatePayment(reg.id, 'verified')}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                            確認繳費
                          </button>
                        )}
                        {reg.payment_status === 'verified' && !reg.member_id && (
                          <button onClick={() => assignMemberId(reg.id, index + 1)}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs">
                            編號
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}