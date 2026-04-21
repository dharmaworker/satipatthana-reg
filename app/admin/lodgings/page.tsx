'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '../_components/AdminHeader'

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
  arc_url: 'ARC／居留證',
  arrival_ticket_url: '來台機票',
  departure_ticket_url: '離台機票',
  test_0817_url: '8/17 快篩',
  test_0819_url: '8/19 快篩',
}

export default function LodgingsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<any | null>(null)
  const [edit, setEdit] = useState<any | null>(null)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [onlyWithStudentId, setOnlyWithStudentId] = useState(false)

  // 學號管理（R-001）：計算下一個可用編號（掃全部 rows 找最大 R-N）
  const nextStudentId = () => {
    let maxN = 0
    for (const r of rows) {
      const m = (r.registration?.student_id || '').match(/^R-(\d+)$/)
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
    }
    return `R-${String(maxN + 1).padStart(3, '0')}`
  }
  const patchStudentId = async (regId: string, student_id: string | null) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: regId, student_id }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setBulkMessage(`操作失敗：${d.error || res.status}`)
      return false
    }
    fetchData()
    return true
  }
  const assignStudentId = async (regId: string) => {
    const next = nextStudentId()
    if (!confirm(`配發學號 ${next}？`)) return
    if (await patchStudentId(regId, next)) setBulkMessage(`已編學號 ${next}`)
  }
  const clearStudentId = async (reg: any) => {
    if (!confirm(`確定註銷 ${reg.chinese_name} 的學號「${reg.student_id}」？`)) return
    if (await patchStudentId(reg.id, null)) setBulkMessage(`已註銷 ${reg.chinese_name} 的學號`)
  }

  const updatePaymentStatus = async (regId: string, payment_status: string) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: regId, payment_status }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setBulkMessage(`繳費狀態更新失敗：${d.error || res.status}`)
      return
    }
    fetchData()
  }

  const sendApprovalNotifications = async () => {
    if (bulkSelected.length === 0) {
      alert('請先勾選至少一位學員')
      return
    }
    if (!confirm(`寄出錄取通知信給 ${bulkSelected.length} 位學員？`)) return
    setBulkSending(true)
    setBulkMessage('')
    const res = await fetch('/api/admin/send-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(false)
    if (res.ok) setBulkSelected([])
  }

  const sendFormalNotifications = async () => {
    if (bulkSelected.length === 0) {
      alert('請先勾選至少一位學員')
      return
    }
    // 正式通知信需要已填食宿，提醒操作員
    const noLodgingCount = filtered
      .filter(r => bulkSelected.includes(r.registration?.id) && !r.id)
      .length
    if (noLodgingCount > 0) {
      if (!confirm(`勾選中有 ${noLodgingCount} 位尚未填食宿登記的學員，通知信內食宿欄位會顯示「—」。確定仍要寄出？`)) return
    } else {
      if (!confirm(`寄出正式學員通知信給 ${bulkSelected.length} 位學員？`)) return
    }
    setBulkSending(true)
    setBulkMessage('')
    const res = await fetch('/api/admin/send-formal-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: bulkSelected }),
    })
    const data = await res.json()
    setBulkMessage(data.message || (res.ok ? '寄送完成' : `寄送失敗：${data.error || res.status}`))
    setBulkSending(false)
    if (res.ok) setBulkSelected([])
  }

  const handleEditUpload = async (kind: string, file: File) => {
    setUploadingKind(kind)
    setEditError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/upload-lodging', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      setEdit((prev: any) => ({ ...prev, [kind + '_url']: data.url }))
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setUploadingKind(null)
    }
  }

  const saveEdit = async () => {
    if (!edit) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/admin/lodgings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '儲存失敗')
      setEdit(null)
      setDetail(null)
      fetchData()
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setSaving(false)
    }
  }

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
    const reg = r.registration || {}
    if (onlyWithStudentId && !reg.student_id) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (reg.chinese_name || '').toLowerCase().includes(q) ||
      (reg.email || '').toLowerCase().includes(q) ||
      (reg.random_code || '').toLowerCase().includes(q) ||
      (reg.member_id || '').toLowerCase().includes(q) ||
      (reg.student_id || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <details open className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <summary className="cursor-pointer font-semibold select-none">💡 操作說明（點擊可折疊）</summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li><strong>本頁對象：</strong>所有狀態為「已錄取」的學員；未填食宿者食宿欄位顯示「—」。</li>
            <li><strong>序號 T-xxx：</strong>僅顯示，由「報名管理」錄取時自動產生。</li>
            <li><strong>學號 R-xxx：</strong>手動編；按「編號」自動配發下一組 R-xxx；按「註銷」可清除。</li>
            <li><strong>繳費狀態：</strong>下拉切換 未繳費／待確認／已確認（學員匯款後由財務人員更新）。</li>
            <li><strong>詳細／編輯：</strong>僅對已填食宿者可用；尚未填寫則不顯示。</li>
            <li><strong>批次寄信流程：</strong>先用搜尋 / 「只顯示已分配學號者」過濾 → 勾選想要送出的學員 → 按對應的批次寄信按鈕。未勾選會提示。
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><strong>批次寄出錄取通知信：</strong>通知學員已錄取，內含繳費/食宿/快篩連結（首次寄，或需補寄）。</li>
                <li><strong>批次寄出正式學員通知信：</strong>彙整學員完整資料（含食宿、證件、學號）寄出。建議確認學號與資料皆正確後再寄。</li>
              </ul>
            </li>
          </ol>
        </details>

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-2 items-center flex-wrap">
          <input className="border border-gray-300 rounded-lg px-4 py-2 text-black w-64"
            placeholder="搜尋姓名 / Email / 繳費碼 / 序號 / 學號"
            value={search} onChange={e => setSearch(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-black cursor-pointer bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
            <input type="checkbox" checked={onlyWithStudentId}
              onChange={e => setOnlyWithStudentId(e.target.checked)} />
            只顯示已分配學號者
          </label>
          <button onClick={fetchData}
            className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-sm">重新整理</button>
          <label className="flex items-center gap-2 text-sm text-black cursor-pointer">
            <input type="checkbox" checked={bulkSelected.length > 0 && bulkSelected.length === filtered.length}
              onChange={() => {
                if (bulkSelected.length === filtered.length) setBulkSelected([])
                else setBulkSelected(filtered.map(r => r.registration?.id).filter(Boolean))
              }} />
            全選本頁
          </label>
          <button onClick={sendApprovalNotifications}
            disabled={bulkSending}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm">
            {bulkSending ? '寄送中...' : `批次寄出錄取通知信 (${bulkSelected.length})`}
          </button>
          <button onClick={sendFormalNotifications}
            disabled={bulkSending}
            className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm">
            {bulkSending ? '寄送中...' : `批次寄出正式學員通知信 (${bulkSelected.length})`}
          </button>
          {bulkMessage && <span className="text-sm text-green-700 font-medium">{bulkMessage}</span>}
          <span className="text-sm text-gray-600 ml-auto">共 {filtered.length} 筆</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-black font-medium">
                    <input type="checkbox"
                      checked={bulkSelected.length > 0 && bulkSelected.length === filtered.length}
                      onChange={() => {
                        if (bulkSelected.length === filtered.length) setBulkSelected([])
                        else setBulkSelected(filtered.map(r => r.registration?.id).filter(Boolean))
                      }} />
                  </th>
                  <th className="px-3 py-3 text-left text-black font-medium">姓名</th>
                  <th className="px-3 py-3 text-left text-black font-medium">序號<br /><span className="text-xs font-normal text-gray-500">T-xxx 錄取自動</span></th>
                  <th className="px-3 py-3 text-left text-black font-medium">學號<br /><span className="text-xs font-normal text-gray-500">R-xxx 手動</span></th>
                  <th className="px-3 py-3 text-left text-black font-medium">繳費碼</th>
                  <th className="px-3 py-3 text-left text-black font-medium">方案</th>
                  <th className="px-3 py-3 text-left text-black font-medium">繳費</th>
                  <th className="px-3 py-3 text-left text-black font-medium">入住－離開</th>
                  <th className="px-3 py-3 text-left text-black font-medium">飲食</th>
                  <th className="px-3 py-3 text-left text-black font-medium">打鼾</th>
                  <th className="px-3 py-3 text-left text-black font-medium">緊急聯絡人</th>
                  <th className="px-3 py-3 text-left text-black font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-black">載入中...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-black">尚無食宿登記</td></tr>
                ) : filtered.map(r => {
                  const reg = r.registration || {}
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <input type="checkbox"
                          checked={bulkSelected.includes(reg.id)}
                          onChange={() => setBulkSelected(prev =>
                            prev.includes(reg.id) ? prev.filter(x => x !== reg.id) : [...prev, reg.id]
                          )} />
                      </td>
                      <td className="px-3 py-3 font-medium text-black">{reg.chinese_name}</td>
                      <td className="px-3 py-3 text-black font-mono">{reg.member_id || '—'}</td>
                      <td className="px-3 py-3 text-black">
                        <div className="font-mono">{reg.student_id || '—'}</div>
                        <div className="flex gap-1 mt-1">
                          {!reg.student_id && (
                            <button onClick={() => assignStudentId(reg.id)}
                              className="text-[10px] text-purple-700 hover:underline">編號</button>
                          )}
                          {reg.student_id && (
                            <button onClick={() => clearStudentId(reg)}
                              className="text-[10px] text-orange-700 hover:underline">註銷</button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-black">{reg.random_code}</td>
                      <td className="px-3 py-3 text-black">{PLAN_LABEL[reg.payment_plan] || reg.payment_plan || '—'}</td>
                      <td className="px-3 py-3 text-xs">
                        <select value={reg.payment_status || 'unpaid'}
                          onChange={e => updatePaymentStatus(reg.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${
                            reg.payment_status === 'unpaid' ? 'bg-gray-100 text-gray-800' :
                            reg.payment_status === 'paid' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          <option value="unpaid">未繳費</option>
                          <option value="paid">待確認</option>
                          <option value="verified">已確認</option>
                        </select>
                        {r.payment_method === 'transfer' ? (
                          <div className="text-black mt-1">匯款</div>
                        ) : r.payment_method === 'credit_card' ? (
                          <div className="text-black mt-1">刷卡</div>
                        ) : null}
                        {reg.payment_note && (
                          <div className="text-gray-500 mt-1 max-w-[200px] truncate" title={reg.payment_note}>
                            {shortNote(reg.payment_note)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-black text-xs">
                        {r.arrival_date ? <>{r.arrival_date}<br />{r.departure_date}</> : <span className="text-gray-400">未填食宿</span>}
                      </td>
                      <td className="px-3 py-3 text-black text-xs">
                        {r.diet ? <>{r.diet === 'meat' ? '葷' : '素'}<br />{r.noon_fasting === 'before_noon' ? '12前' : '12後'}</> : '—'}
                      </td>
                      <td className="px-3 py-3 text-black text-xs">{r.id ? (r.snoring ? '會' : '否') : '—'}</td>
                      <td className="px-3 py-3 text-black text-xs">
                        {r.emergency_name ? <>
                          {r.emergency_name}<br />
                          <span className="text-gray-500">{r.emergency_relation}</span><br />
                          {r.emergency_phone}
                        </> : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setDetail(r)}
                            disabled={!r.id}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 px-2 py-1 rounded text-xs">
                            詳細
                          </button>
                          <button onClick={() => { setEdit({ ...r }); setEditError('') }}
                            disabled={!r.id}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-800 disabled:bg-gray-50 disabled:text-gray-400 px-2 py-1 rounded text-xs">
                            編輯
                          </button>
                        </div>
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
              <Field label="序號" value={detail.registration?.member_id} />
              <Field label="學號" value={detail.registration?.student_id} />
              <Field label="Email" value={detail.registration?.email} />
              <Field label="手機" value={detail.registration?.phone} />
              <Field label="居住地" value={detail.registration?.residence} />
              <Field label="方案" value={PLAN_LABEL[detail.registration?.payment_plan] || detail.registration?.payment_plan} />
              <Field label="繳費方式" value={detail.payment_method === 'transfer' ? '匯款' : '刷卡'} />
              <Field label="繳費狀態" value={({ unpaid: '未繳費', paid: '已回報待確認', verified: '已確認繳費' } as Record<string, string>)[detail.registration?.payment_status] || detail.registration?.payment_status} />
              <Field label="繳費確認時間" value={detail.registration?.payment_confirmed_at ? new Date(detail.registration.payment_confirmed_at).toLocaleString('zh-TW') : '—'} />
              {detail.registration?.payment_note && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">繳費備註</div>
                  <div className="text-black text-xs bg-gray-50 rounded p-2 break-all">{detail.registration.payment_note}</div>
                </div>
              )}
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

      {edit && (
        <div onClick={() => !saving && setEdit(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-black text-lg">
                編輯食宿登記：{edit.registration?.chinese_name}
              </h3>
              <button onClick={() => !saving && setEdit(null)}
                className="text-gray-500 hover:text-black text-xl leading-none">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-black mb-1">入住日</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.arrival_date || ''}
                  onChange={e => setEdit({ ...edit, arrival_date: e.target.value })}>
                  <option value="2026-08-19">2026-08-19</option>
                  <option value="2026-08-20">2026-08-20</option>
                </select>
              </div>
              <div>
                <label className="block text-black mb-1">離開日</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.departure_date || ''}
                  onChange={e => setEdit({ ...edit, departure_date: e.target.value })}>
                  <option value="2026-08-24">2026-08-24</option>
                  <option value="2026-08-25">2026-08-25</option>
                </select>
              </div>
              <div>
                <label className="block text-black mb-1">繳費方式</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.payment_method || ''}
                  onChange={e => setEdit({ ...edit, payment_method: e.target.value })}>
                  <option value="transfer">匯款</option>
                  <option value="credit_card">刷卡</option>
                </select>
              </div>
              <div>
                <label className="block text-black mb-1">飲食</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.diet || ''}
                  onChange={e => setEdit({ ...edit, diet: e.target.value })}>
                  <option value="meat">葷食</option>
                  <option value="vegetarian">素食</option>
                </select>
              </div>
              <div>
                <label className="block text-black mb-1">過午不食</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.noon_fasting || ''}
                  onChange={e => setEdit({ ...edit, noon_fasting: e.target.value })}>
                  <option value="before_noon">12 前吃</option>
                  <option value="after_noon">12 後吃</option>
                </select>
              </div>
              <div>
                <label className="block text-black mb-1">茶點</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.snacks || ''}
                  onChange={e => setEdit({ ...edit, snacks: e.target.value })}>
                  <option value="snacks_and_drink">茶點+咖啡/茶</option>
                  <option value="drink_only">只咖啡/茶</option>
                </select>
              </div>
              <div>
                <label className="block text-black mb-1">前往方式</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.arrival_transport || ''}
                  onChange={e => setEdit({ ...edit, arrival_transport: e.target.value })}>
                  <option value="self">8/19 自行</option>
                  <option value="taipei_bus">台北專車</option>
                  <option value="wuri_bus">烏日專車</option>
                  <option value="airport_bus_0819">桃園機場專車</option>
                  <option value="self_0820">8/20 自行</option>
                </select>
              </div>
              <div>
                <label className="block text-black mb-1">離開方式</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.departure_transport || ''}
                  onChange={e => setEdit({ ...edit, departure_transport: e.target.value })}>
                  <option value="self">自行</option>
                  <option value="bus">專車</option>
                </select>
              </div>
              {edit.departure_transport === 'bus' && (
                <div className="col-span-2">
                  <label className="block text-black mb-1">專車目的地</label>
                  <select className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                    value={edit.bus_destination || ''}
                    onChange={e => setEdit({ ...edit, bus_destination: e.target.value })}>
                    <option value="">—</option>
                    <option value="taipei_824_pm">8/24 下午台北</option>
                    <option value="taipei_825_am">8/25 上午台北</option>
                    <option value="wuri_825_am">8/25 上午烏日</option>
                    <option value="taoyuan_824_pm">8/24 下午桃園機場</option>
                    <option value="taoyuan_825_am">8/25 上午桃園機場</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-black mb-1">緊急聯絡人姓名</label>
                <input className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.emergency_name || ''}
                  onChange={e => setEdit({ ...edit, emergency_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-black mb-1">關係</label>
                <input className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.emergency_relation || ''}
                  onChange={e => setEdit({ ...edit, emergency_relation: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="block text-black mb-1">緊急聯絡電話</label>
                <input className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.emergency_phone || ''}
                  onChange={e => setEdit({ ...edit, emergency_phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-black mb-1">抵台日期</label>
                <input type="date" className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.flight_arrival_date || ''}
                  onChange={e => setEdit({ ...edit, flight_arrival_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-black mb-1">抵台時間</label>
                <input className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.flight_arrival_time || ''}
                  onChange={e => setEdit({ ...edit, flight_arrival_time: e.target.value })} />
              </div>
              <div>
                <label className="block text-black mb-1">離台日期</label>
                <input type="date" className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.flight_departure_date || ''}
                  onChange={e => setEdit({ ...edit, flight_departure_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-black mb-1">離台時間</label>
                <input className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                  value={edit.flight_departure_time || ''}
                  onChange={e => setEdit({ ...edit, flight_departure_time: e.target.value })} />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-black">
                <input type="checkbox" checked={!!edit.dinner_0819}
                  onChange={e => setEdit({ ...edit, dinner_0819: e.target.checked })} />
                8/19 晚餐
              </label>
              <label className="col-span-2 flex items-center gap-2 text-black">
                <input type="checkbox" checked={!!edit.dinner_0824}
                  onChange={e => setEdit({ ...edit, dinner_0824: e.target.checked })} />
                8/24 晚餐
              </label>
              <label className="col-span-2 flex items-center gap-2 text-black">
                <input type="checkbox" checked={!!edit.snoring}
                  onChange={e => setEdit({ ...edit, snoring: e.target.checked })} />
                打鼾
              </label>
            </div>

            <h4 className="font-semibold text-black mt-6 mb-2">檔案管理</h4>
            <p className="text-xs text-gray-500 mb-2">學員傳錯檔可在此重新上傳或清除</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(DOC_LABEL).map(([k, label]) => {
                const kind = k.replace(/_url$/, '')
                const url = edit[k]
                return (
                  <div key={k} className="border border-gray-200 rounded p-2 space-y-1">
                    <p className="text-black font-medium">{label}</p>
                    {url ? (
                      <div className="flex items-center gap-2">
                        <a href={url} target="_blank" rel="noreferrer"
                          className="text-blue-600 underline">檢視</a>
                        <button onClick={() => setEdit({ ...edit, [k]: null })}
                          className="text-red-600 hover:underline">清除</button>
                      </div>
                    ) : (
                      <p className="text-gray-400">未上傳</p>
                    )}
                    <input type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={uploadingKind === kind}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleEditUpload(kind, f) }}
                      className="text-xs" />
                    {uploadingKind === kind && <p className="text-gray-500">上傳中...</p>}
                  </div>
                )
              })}
            </div>

            {editError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">{editError}</div>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => !saving && setEdit(null)}
                className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm">取消</button>
              <button onClick={saveEdit} disabled={saving || !!uploadingKind}
                className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm">
                {saving ? '儲存中...' : '儲存'}
              </button>
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

function paymentStatusBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    unpaid: { cls: 'bg-gray-100 text-gray-700', label: '未繳費' },
    paid: { cls: 'bg-blue-100 text-blue-800', label: '待確認' },
    verified: { cls: 'bg-green-100 text-green-800', label: '已確認' },
  }
  const info = map[status] || { cls: 'bg-gray-100 text-gray-700', label: status || '—' }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${info.cls}`}>{info.label}</span>
}

// 把 payment_note 精簡成一行摘要。匯款：抓後五碼；刷卡：抓交易號
function shortNote(note: string): string {
  if (!note) return ''
  const match5 = note.match(/後五碼[:：]\s*(\d{5})/)
  if (match5) return `後五碼 ${match5[1]}`
  const tradeNo = note.match(/交易號[:：]\s*(\S+)/)
  if (tradeNo) return `綠界 ${tradeNo[1]}`
  return note.length > 20 ? note.slice(0, 20) + '…' : note
}

function transportLabel(v: string) {
  return {
    self: '8/19 自行抵達',
    taipei_bus: '主辦專車（8/19 台北車站）',
    wuri_bus: '主辦專車（8/19 烏日高鐵）',
    airport_bus_0819: '主辦專車（8/19 桃園機場）',
    self_0820: '8/20 自行抵達',
  }[v] || v || '—'
}
function busDestLabel(v: string) {
  return {
    taipei_824_pm: '8/24 下午 6:00-6:30 到台北車站',
    taipei_825_am: '8/25 上午 9 點到台北車站',
    wuri_825_am: '8/25 上午 9 點到烏日高鐵',
    taoyuan_824_pm: '8/24 下午 6:00-6:30 到桃園機場',
    taoyuan_825_am: '8/25 上午 9 點到桃園機場',
  }[v] || v
}
