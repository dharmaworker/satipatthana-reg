'use client'
import { useState, useEffect } from 'react'

type QueryResult = {
  id: string
  random_code: string
  name: string
  residence: string | null
  payment_plan: string | null
  status: string
  status_raw: 'pending' | 'approved' | 'rejected'
  payment_status: string
  payment_status_raw: 'unpaid' | 'paid' | 'verified'
  member_id: string
  student_id: string | null
  applied_at: string
  lodging_status: 'none' | 'submitted_editable' | 'locked'
  tests_uploaded: number
  tests_total: number
}

export default function QueryPage() {
  const [form, setForm] = useState({ email: '', random_code: '' })
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [autoLoaded, setAutoLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/member/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const statusMap: Record<string, string> = { pending: '審核中', approved: '已錄取', rejected: '未錄取' }
          const paymentMap: Record<string, string> = { unpaid: '尚未繳費', paid: '已繳費，待確認', verified: '繳費已確認' }
          setResult({
            id: data.id,
            random_code: data.random_code,
            name: data.chinese_name,
            residence: data.residence || null,
            payment_plan: data.payment_plan || null,
            member_id: data.member_id || '待編號',
            student_id: data.student_id || null,
            status: statusMap[data.status] || data.status,
            status_raw: data.status,
            payment_status: paymentMap[data.payment_status] || data.payment_status,
            payment_status_raw: data.payment_status,
            applied_at: '',
            lodging_status: data.lodging_status || 'none',
            tests_uploaded: data.tests_uploaded ?? 0,
            tests_total: data.tests_total ?? 2,
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

  const lodgingLabel = (s: string) =>
    s === 'none' ? '❌ 尚未送出' : s === 'submitted_editable' ? '✅ 已送出（還能修改 1 次）' : '🔒 已修改過，鎖定'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">第二屆台灣四念處禪修</h1>
        <p className="mt-2 text-green-200">報名狀態查詢</p>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

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
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
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
          <>
            {/* 狀態總覽 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
              <h2 className="text-lg font-semibold text-green-800">查詢結果</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">姓名</div>
                  <div className="text-black font-medium">{result.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">序號</div>
                  <div className="text-black font-medium font-mono">{result.member_id}</div>
                </div>
                {result.student_id && (
                  <div>
                    <div className="text-xs text-gray-500">學號</div>
                    <div className="text-black font-medium font-mono">{result.student_id}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">審核狀態</div>
                  <div className="text-black font-medium">{result.status}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">繳費狀態</div>
                  <div className="text-black font-medium">{result.payment_status}</div>
                </div>
                {result.payment_plan && (
                  <div>
                    <div className="text-xs text-gray-500">繳費方案</div>
                    <div className="text-black font-medium">{result.payment_plan}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">食宿登記</div>
                  <div className="text-black">{lodgingLabel(result.lodging_status)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">快篩上傳</div>
                  <div className="text-black">{result.tests_uploaded}/{result.tests_total}</div>
                </div>
              </div>
            </div>

            {/* 已錄取 → 3 個動作按鈕（對齊錄取信） */}
            {result.status_raw === 'approved' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
                <h2 className="text-lg font-semibold text-green-800">後續流程（可平行進行）</h2>
                <p className="text-xs text-gray-600">三個流程不需依序；請依各自截止時間完成。</p>

                <a href={`/pay?id=${result.id}&code=${result.random_code}`}
                  className={`block w-full rounded-xl p-4 text-white text-center transition-colors ${
                    result.payment_status_raw === 'verified'
                      ? 'bg-gray-400 pointer-events-none'
                      : 'bg-green-700 hover:bg-green-800'
                  }`}>
                  <div className="font-semibold">
                    {result.payment_status_raw === 'verified' ? '✅ ① 繳費已完成' : '① 前往繳費'}
                  </div>
                  <div className="text-xs text-green-100 mt-0.5">截止：6/15 晚上 8 點</div>
                </a>

                <a href={`/lodging?id=${result.id}&code=${result.random_code}`}
                  className={`block w-full rounded-xl p-4 text-white text-center transition-colors ${
                    result.lodging_status === 'locked' ? 'bg-gray-500' : 'bg-blue-700 hover:bg-blue-800'
                  }`}>
                  <div className="font-semibold">
                    {result.lodging_status === 'none' ? '② 前往食宿登記' :
                     result.lodging_status === 'submitted_editable' ? '② 食宿登記（可再修改 1 次）' :
                     '🔒 ② 食宿登記已鎖定'}
                  </div>
                  <div className="text-xs text-blue-100 mt-0.5">截止：6/20 晚上 8 點</div>
                </a>

                <a href={`/quicktests?id=${result.id}&code=${result.random_code}`}
                  className="block w-full rounded-xl p-4 text-white text-center bg-purple-700 hover:bg-purple-800 transition-colors">
                  <div className="font-semibold">
                    ③ 快篩上傳（已上傳 {result.tests_uploaded}/{result.tests_total}）
                  </div>
                  <div className="text-xs text-purple-100 mt-0.5">8/17 上午 8–晚上 8、8/19 上午 12 前</div>
                </a>
              </div>
            )}

            {result.status_raw === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-900">
                您的報名仍在審核中，錄取者將於 <strong>6/6</strong> 透過 Email 發送錄取通知。
              </div>
            )}
            {result.status_raw === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900">
                很遺憾，本次未錄取。如有疑問請聯絡台灣四念處學會。
              </div>
            )}
          </>
        )}

        {autoLoaded && (
          <a href="/member/dashboard" className="block text-center text-green-700 hover:text-green-800">
            ← 返回學員專區
          </a>
        )}

        <p className="text-center text-sm text-gray-500">如有問題請聯繫台灣四念處學會</p>
      </div>
    </div>
  )
}
