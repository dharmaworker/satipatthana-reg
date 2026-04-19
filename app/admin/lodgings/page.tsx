'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLAN_LABEL: Record<string, string> = {
  A1: 'A(1) 匯款', A2: 'A(2) 刷卡',
  B1: 'B(1) 匯款', B2: 'B(2) 刷卡',
  C1: 'C(1) 匯款', C2: 'C(2) 刷卡',
  D1: 'D(1) 匯款', D2: 'D(2) 刷卡',
  T1: 'T1 測試匯款', T2: 'T2 測試刷卡',
}

const DOC_LABEL: Record<string, string> = {
  photo_url: '個人照片',
  id_front_url: '身分證正面',
  id_back_url: '身分證反面',
  passport_url: '護照',
  arrival_ticket_url: '來台機票',
  departure_ticket_url: '離台機票',
  test_0817_url: '8/17 快篩',
  test_0819_url: '8/19 快篩',
  test_0820_url: '8/20 快篩',
  test_0822_url: '8/22 快篩',
}

export default function LodgingsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<any | null>(null)
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/lodgings')
    if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return }
    const data = await res.json()
    setRows(data.data || [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    const reg = r.registration || {}
    return (
      (reg.chinese_name || '').toLowerCase().includes(q) ||
      (reg.email || '').toLowerCase().includes(q) ||
      (reg.random_code || '').toLowerCase().includes(q) ||
      (reg.member_id || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">食宿登記管理</h1>
        <button onClick={() => router.push('/admin/dashboard')}
          className="text-green-200 hover:text-white text-sm">← 返回 Dashboard</button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-2 items-center">
          <input className="border border-gray-300 rounded-lg px-4 py-2 text-black w-64"
            placeholder="搜尋姓名 / Email / 繳費碼 / 學號"
            value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={fetchData}
            className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-sm">重新整理</button>
          <span className="text-sm text-gray-600 ml-auto">共 {filtered.length} 筆</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-black font-medium">姓名</th>
                  <th className="px-3 py-3 text-left text-black font-medium">學號</th>
                  <th className="px-3 py-3 text-left text-black font-medium">繳費碼</th>
                  <th className="px-3 py-3 text-left text-black font-medium">方案</th>
                  <th className="px-3 py-3 text-left text-black font-medium">入住－離開</th>
                  <th className="px-3 py-3 text-left text-black font-medium">飲食</th>
                  <th className="px-3 py-3 text-left text-black font-medium">打鼾</th>
                  <th className="px-3 py-3 text-left text-black font-medium">緊急聯絡人</th>
                  <th className="px-3 py-3 text-left text-black font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-black">載入中...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-black">尚無食宿登記</td></tr>
                ) : filtered.map(r => {
                  const reg = r.registration || {}
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-black">{reg.chinese_name}</td>
                      <td className="px-3 py-3 text-black">{reg.member_id || '—'}</td>
                      <td className="px-3 py-3 font-mono text-black">{reg.random_code}</td>
                      <td className="px-3 py-3 text-black">{PLAN_LABEL[reg.payment_plan] || reg.payment_plan || '—'}</td>
                      <td className="px-3 py-3 text-black text-xs">
                        {r.arrival_date} <br />{r.departure_date}
                      </td>
                      <td className="px-3 py-3 text-black text-xs">
                        {r.diet === 'meat' ? '葷' : '素'}<br />
                        {r.noon_fasting === 'before_noon' ? '12前' : '12後'}
                      </td>
                      <td className="px-3 py-3 text-black text-xs">{r.snoring ? '會' : '否'}</td>
                      <td className="px-3 py-3 text-black text-xs">
                        {r.emergency_name}<br />
                        <span className="text-gray-500">{r.emergency_relation}</span><br />
                        {r.emergency_phone}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => setDetail(r)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                          詳細
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail && (
        <div onClick={() => setDetail(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-black text-lg">
                {detail.registration?.chinese_name}（{detail.registration?.random_code}）
              </h3>
              <button onClick={() => setDetail(null)}
                className="text-gray-500 hover:text-black text-xl leading-none">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="學號" value={detail.registration?.member_id} />
              <Field label="Email" value={detail.registration?.email} />
              <Field label="手機" value={detail.registration?.phone} />
              <Field label="居住地" value={detail.registration?.residence} />
              <Field label="方案" value={PLAN_LABEL[detail.registration?.payment_plan] || detail.registration?.payment_plan} />
              <Field label="繳費方式" value={detail.payment_method === 'transfer' ? '匯款' : '刷卡'} />
              <Field label="入住日" value={detail.arrival_date} />
              <Field label="離開日" value={detail.departure_date} />
              <Field label="前往方式" value={transportLabel(detail.arrival_transport)} />
              <Field label="離開方式" value={`${detail.departure_transport === 'bus' ? '專車' : '自行'}${detail.bus_destination ? '（' + busDestLabel(detail.bus_destination) + '）' : ''}`} />
              <Field label="飲食" value={detail.diet === 'meat' ? '葷食' : '素食'} />
              <Field label="過午不食" value={detail.noon_fasting === 'before_noon' ? '12 前吃' : '12 後吃'} />
              <Field label="茶點" value={detail.snacks === 'snacks_and_drink' ? '茶點 + 咖啡/茶' : '只咖啡/茶'} />
              <Field label="8/19 晚餐" value={detail.dinner_0819 ? '是' : '否'} />
              <Field label="8/24 晚餐" value={detail.dinner_0824 ? '是' : '否'} />
              <Field label="打鼾" value={detail.snoring ? '會' : '不會'} />
              <Field label="緊急聯絡人" value={`${detail.emergency_name}（${detail.emergency_relation}）${detail.emergency_phone}`} />
            </div>

            {(detail.flight_arrival_date || detail.flight_departure_date) && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-black mb-2">航班資訊</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Field label="抵台日期" value={detail.flight_arrival_date} />
                  <Field label="抵台時間" value={detail.flight_arrival_time} />
                  <Field label="離台日期" value={detail.flight_departure_date} />
                  <Field label="離台時間" value={detail.flight_departure_time} />
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4">
              <h4 className="font-semibold text-black mb-2">已上傳檔案</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(DOC_LABEL).map(([k, label]) => {
                  const url = detail[k]
                  if (!url) return null
                  const isImage = !url.toLowerCase().endsWith('.pdf')
                  return (
                    <button key={k} onClick={() => setPreview({ url, title: label })}
                      className="border border-gray-200 rounded p-2 text-left hover:border-green-500">
                      {isImage ? (
                        <img src={url} alt={label} className="w-full h-24 object-cover rounded" />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-600 text-xs">PDF</div>
                      )}
                      <p className="text-xs text-black mt-1">{label}</p>
                    </button>
                  )
                })}
              </div>
              {!Object.keys(DOC_LABEL).some(k => detail[k]) && (
                <p className="text-gray-400 text-sm">尚未上傳任何檔案</p>
              )}
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-3xl w-full p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-black">{preview.title}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-black text-xl">✕</button>
            </div>
            {preview.url.toLowerCase().endsWith('.pdf') ? (
              <iframe src={preview.url} className="w-full h-[70vh] border" />
            ) : (
              <img src={preview.url} alt={preview.title} className="w-full h-auto" />
            )}
            <div className="mt-3 flex gap-2 justify-end">
              <a href={preview.url} target="_blank" rel="noreferrer"
                className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm">新分頁</a>
              <a href={preview.url} download
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded text-sm">下載</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-black">{value || '—'}</div>
    </div>
  )
}

function transportLabel(v: string) {
  return {
    self: '自行抵達',
    taipei_bus: '主辦專車（8/19 台北車站）',
    wuri_bus: '主辦專車（8/19 烏日高鐵）',
  }[v] || v || '—'
}
function busDestLabel(v: string) {
  return {
    taipei_824_pm: '8/24 下午 6:00-6:30 到台北車站',
    taipei_825_am: '8/25 上午 9 點到台北車站',
    wuri_825_am: '8/25 上午 9 點到烏日高鐵',
  }[v] || v
}
