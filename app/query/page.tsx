'use client'
import { useState } from 'react'

type QueryResult = {
  name: string
  status: string
  status_raw: 'pending' | 'approved' | 'rejected'
  member_id: string
}

export default function QueryPage() {
  const [form, setForm] = useState({ email: '', random_code: '' })
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">第二屆台灣四念處禪修</h1>
        <p className="mt-2 text-green-200">報名狀態查詢</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-green-800">查詢是否錄取</h2>
          <p className="text-xs text-gray-600">輸入報名時的 Email 與繳費專屬碼，查看審核結果。</p>

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
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}

          <button
            onClick={handleQuery}
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? '查詢中...' : '查詢'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3 text-center">
            <h2 className="text-lg font-semibold text-green-800">查詢結果</h2>

            <div className="space-y-1 pt-2">
              <p className="text-sm text-gray-500">姓名</p>
              <p className="text-xl font-bold text-black">{result.name}</p>
            </div>

            {result.status_raw === 'approved' && (
              <>
                <div className="space-y-1 pt-2">
                  <p className="text-sm text-gray-500">審核狀態</p>
                  <p className="text-2xl font-bold text-green-700">🎉 已錄取</p>
                </div>
                <div className="space-y-1 pt-2">
                  <p className="text-sm text-gray-500">序號</p>
                  <p className="text-xl font-bold font-mono text-black">{result.member_id}</p>
                </div>
                <div className="pt-4">
                  <a href="/member"
                    className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                    進入學員專區 →
                  </a>
                  <p className="text-xs text-gray-500 mt-2">繳費 / 食宿登記 / 快篩上傳 都在學員專區</p>
                </div>
              </>
            )}

            {result.status_raw === 'pending' && (
              <div className="pt-2">
                <p className="text-2xl font-bold text-yellow-700">⏳ 審核中</p>
                <p className="text-sm text-gray-600 mt-2">錄取者將於 <strong>6/6</strong> 透過 Email 發送錄取通知。</p>
              </div>
            )}

            {result.status_raw === 'rejected' && (
              <div className="pt-2">
                <p className="text-2xl font-bold text-red-700">未錄取</p>
                <p className="text-sm text-gray-600 mt-2">感恩您的報名。如有疑問請聯絡台灣四念處學會。</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500">如有問題請聯繫台灣四念處學會</p>
      </div>
    </div>
  )
}
