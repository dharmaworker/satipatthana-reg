'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const TESTS: { key: string; label: string; deadline: string }[] = [
  { key: 'test_0817_url', label: '8/17 上午 8 點至晚上 8 點前', deadline: '2026-08-17' },
  { key: 'test_0819_url', label: '8/19 上午 12 點前', deadline: '2026-08-19' },
]

function QuickTestsContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [reg, setReg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)

  const [files, setFiles] = useState<Record<string, string>>({
    test_0817_url: '', test_0819_url: '',
  })
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !code) {
      setError('網址缺少必要參數')
      setLoading(false)
      return
    }
    fetch(`/api/quicktests?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '載入失敗')
        setReg(data.registration)
        if (data.lodging) {
          setFiles({
            test_0817_url: data.lodging.test_0817_url || '',
            test_0819_url: data.lodging.test_0819_url || '',
          })
          setLastUpdate(data.lodging.updated_at || null)
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, code])

  const handleUpload = async (kind: string, file: File) => {
    setUploadingKind(kind)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/upload-lodging', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      setFiles(prev => ({ ...prev, [kind + '_url']: data.url }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploadingKind(null)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/quicktests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, ...files }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '送出失敗')
      setDone(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  if (error && !reg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <p className="text-5xl mb-4">🙏</p>
          <h2 className="text-xl font-bold text-green-800 mb-2">快篩上傳已收到</h2>
          <p className="text-gray-600 mb-4">系統已寄出確認信至您的 Email。<br />未上傳的時段請於規定時間前回到此頁補上。</p>
          <button onClick={() => setDone(false)}
            className="inline-block bg-gray-100 hover:bg-gray-200 text-black px-6 py-2 rounded-lg">
            返回繼續上傳
          </button>
        </div>
      </div>
    )
  }

  const uploadedCount = Object.values(files).filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-6 px-4 text-center">
        <h1 className="text-xl font-bold">第二屆台灣四念處禪修－快篩檢測上傳</h1>
        <p className="text-sm text-green-200 mt-1">{reg.chinese_name} 法友 ／ 學號 {reg.member_id || '待編號'}</p>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <p className="font-semibold">注意事項</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>檢測結果必須<strong>載明檢測日期、學號、姓名</strong>。</li>
            <li>快篩試劑請<strong>自備</strong>，主辦單位不提供。</li>
            <li>請依下方兩個時段於規定時間前上傳；可分次回到此頁補上。</li>
            <li>課程期間的 8/20、8/22 快篩結果<strong>現場繳交</strong>，不需於此上傳。</li>
          </ul>
        </div>

        {lastUpdate && uploadedCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            <p>已上傳 {uploadedCount}/2 次。最後更新：{new Date(lastUpdate).toLocaleString('zh-TW')}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          {TESTS.map(t => {
            const url = files[t.key]
            const kind = t.key.replace(/_url$/, '')
            const isImage = url && !url.toLowerCase().endsWith('.pdf')
            const uploading = uploadingKind === kind
            const inputId = `qt-${kind}`
            return (
              <div key={t.key} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <label htmlFor={inputId} className="text-black font-semibold">{t.label}</label>
                  {url && <span className="text-xs text-green-700 font-medium whitespace-nowrap">✓ 已上傳</span>}
                </div>

                {url && (
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded p-2">
                    {isImage ? (
                      <img src={url} alt={t.label} className="w-16 h-16 object-cover border rounded" />
                    ) : (
                      <span className="text-2xl">📄</span>
                    )}
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">點此檢視</a>
                    <button onClick={() => setFiles(prev => ({ ...prev, [t.key]: '' }))}
                      className="ml-auto text-xs text-red-600 hover:underline">清除</button>
                  </div>
                )}

                <label htmlFor={inputId}
                  className={`block w-full border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
                    uploading
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                      : url
                      ? 'border-green-400 bg-green-50 hover:bg-green-100 text-green-800'
                      : 'border-green-500 bg-white hover:bg-green-50 text-green-800'
                  }`}>
                  {uploading ? (
                    <>
                      <div className="text-2xl mb-1">⏳</div>
                      <div className="text-sm font-medium">上傳中，請稍候...</div>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl mb-1">📤</div>
                      <div className="text-sm font-semibold">
                        {url ? '點此重新上傳' : '點此選擇快篩照片'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">支援 JPG / PNG / WEBP / PDF（5MB 以下）</div>
                    </>
                  )}
                  <input id={inputId} type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={uploading}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(kind, f) }} />
                </label>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        )}

        <button onClick={handleSubmit} disabled={submitting || !!uploadingKind}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl">
          {submitting ? '送出中...' : '送出 / 更新快篩上傳'}
        </button>
        <p className="text-center text-xs text-gray-500">送出後系統會寄確認信。可隨時回到此頁更新。</p>
      </div>
    </div>
  )
}

export default function QuickTestsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">載入中...</div>}>
      <QuickTestsContent />
    </Suspense>
  )
}
