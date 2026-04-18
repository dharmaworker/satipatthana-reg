'use client'
import { useState, useEffect } from 'react'

export default function QueryPage() {
  const [form, setForm] = useState({ email: '', random_code: '' })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [autoLoaded, setAutoLoaded] = useState(false)

  // 如果是從學員專區來的，直接用 cookie 載入資料
  useEffect(() => {
    fetch('/api/member/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setResult({
            name: data.chinese_name,
            member_id: data.member_id || '待編號',
            status: ({ pending: '審核中', approved: '已錄取，待繳費', rejected: '未錄取' } as Record<string, string>)[data.status] || data.status,
            payment_status: ({ unpaid: '尚未繳費', paid: '已繳費，確認中', verified: '繳費確認完成' } as Record<string, string>)[data.payment_status] || data.payment_status,
          })
          setAutoLoaded(true)
        }
        setLoading(false)
      })
  }, [])

  const handleQuery = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">第二屆台灣四念處禪修</h1>
        <p className="mt-2 text-green-200">報名狀態查詢</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        {/* 沒有自動登入才顯示輸入框 */}
        {!autoLoaded && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-green-800">查詢您的報名狀態</h2>

            <div>
              <label className="block text-sm font-medium text-black mb-1">電子信箱（E-MAIL）</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="請輸入報名時填寫的 Email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">繳費專屬碼</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black uppercase"
                placeholder="請輸入錄取通知信中的專屬碼"
                value={form.random_code}
                onChange={e => setForm(prev => ({ ...prev, random_code: e.target.value.toUpperCase() }))}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleQuery}
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? '查詢中...' : '查詢'}
            </button>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-green-800">查詢結果</h2>
            <div className="space-y-3">
              {[
                { label: '姓名', value: result.name },
                { label: '學號', value: result.member_id },
                { label: '審核狀態', value: result.status },
                { label: '繳費狀態', value: result.payment_status },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-black font-medium">{label}</span>
                  <span className="text-black">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {autoLoaded && (
          <a href="/member/dashboard" className="block text-center text-green-700 hover:text-green-800">
            ← 返回學員專區
          </a>
        )}

        <p className="text-center text-sm text-gray-500">
          如有問題請聯繫台灣四念處學會
        </p>
      </div>
    </div>
  )
}