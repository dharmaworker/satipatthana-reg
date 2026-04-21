'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

const DOC_COLS: { key: string; label: string }[] = [
  { key: 'photo_url', label: '個人相片' },
  { key: 'id_front_url', label: '身分證正面' },
  { key: 'id_back_url', label: '身分證反面' },
  { key: 'passport_url', label: '護照' },
  { key: 'arc_url', label: 'ARC／居留證' },
  { key: 'arrival_ticket_url', label: '來台機票' },
  { key: 'departure_ticket_url', label: '離台機票' },
  { key: 'test_0817_url', label: '8/17 快篩' },
  { key: 'test_0819_url', label: '8/19 快篩' },
]

export default function DocumentsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [missingOnly, setMissingOnly] = useState(false)
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

  const requiredDocs = (r: any): { uploaded: number; total: number } => {
    const hasId = !!(r.id_front_url && r.id_back_url)
    const hasPassport = !!r.passport_url
    const hasArc = !!r.arc_url
    let total = 2 // 相片 + 證件一組（身分證正反 / 護照 / ARC）擇一
    let uploaded = 0
    if (r.photo_url) uploaded += 1
    if (hasId || hasPassport || hasArc) uploaded += 1
    // 短期旅客才計機票；ARC 與台灣人不計
    if (hasPassport) {
      total += 2
      if (r.arrival_ticket_url) uploaded += 1
      if (r.departure_ticket_url) uploaded += 1
    }
    return { uploaded, total }
  }

  const filtered = rows.filter(r => {
    const reg = r.registration || {}
    if (search) {
      const q = search.toLowerCase()
      const match =
        (reg.chinese_name || '').toLowerCase().includes(q) ||
        (reg.passport_name || '').toLowerCase().includes(q) ||
        (reg.member_id || '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (missingOnly) {
      const { uploaded, total } = requiredDocs(r)
      if (uploaded >= total) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-2 items-center flex-wrap">
          <input className="border border-gray-300 rounded-lg px-4 py-2 text-black w-64"
            placeholder="搜尋姓名 / 英文姓名 / 學號"
            value={search} onChange={e => setSearch(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-black cursor-pointer">
            <input type="checkbox" checked={missingOnly}
              onChange={e => setMissingOnly(e.target.checked)} />
            只顯示未繳齊
          </label>
          <button onClick={fetchData}
            className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-sm">重新整理</button>
          <span className="text-sm text-gray-600 ml-auto">共 {filtered.length} 筆</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-black font-medium whitespace-nowrap">姓名</th>
                  <th className="px-3 py-3 text-left text-black font-medium whitespace-nowrap">學號</th>
                  <th className="px-3 py-3 text-left text-black font-medium whitespace-nowrap">居住地</th>
                  {DOC_COLS.map(c => (
                    <th key={c.key} className="px-3 py-3 text-center text-black font-medium whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={3 + DOC_COLS.length} className="px-4 py-8 text-center text-black">載入中...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={3 + DOC_COLS.length} className="px-4 py-8 text-center text-black">尚無資料</td></tr>
                ) : filtered.map(r => {
                  const reg = r.registration || {}
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-black whitespace-nowrap">
                        {reg.chinese_name}
                        {reg.passport_name && (
                          <div className="text-xs text-gray-500">{reg.passport_name}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-black whitespace-nowrap">{reg.member_id || '—'}</td>
                      <td className="px-3 py-3 text-black text-xs whitespace-nowrap">{reg.residence || '—'}</td>
                      {DOC_COLS.map(c => {
                        const url: string = r[c.key] || ''
                        return (
                          <td key={c.key} className="px-2 py-2 text-center">
                            {url ? (
                              <DocCell url={url} label={c.label} onOpen={() => setPreview({ url, title: `${reg.chinese_name}　${c.label}` })} />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {preview && (
        <div onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-4xl w-full p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-black">{preview.title}</h3>
              <div className="flex gap-2">
                <a href={preview.url} target="_blank" rel="noreferrer"
                  className="text-sm text-blue-600 underline">開新視窗</a>
                <button onClick={() => setPreview(null)}
                  className="text-gray-500 hover:text-black">✕</button>
              </div>
            </div>
            {preview.url.toLowerCase().endsWith('.pdf') ? (
              <iframe src={preview.url} className="w-full h-[70vh] border rounded" />
            ) : (
              <img src={preview.url} alt={preview.title}
                className="max-w-full max-h-[75vh] mx-auto object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DocCell({ url, label, onOpen }: { url: string; label: string; onOpen: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    return (
      <button onClick={onOpen}
        className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
        📄 PDF
      </button>
    )
  }
  return (
    <button onClick={onOpen} className="block mx-auto">
      <img src={url} alt={label}
        className="w-12 h-12 object-cover border rounded hover:opacity-80" />
    </button>
  )
}
