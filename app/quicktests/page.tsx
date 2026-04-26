'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const TESTS: { key: 'test_0817_url' | 'test_0819_url'; label: string; date: string; deadline: string }[] = [
  { key: 'test_0817_url', label: '8/17 快篩上傳', date: '08.17', deadline: '8/17 上午 8 點 ～ 晚上 8 點前' },
  { key: 'test_0819_url', label: '8/19 快篩上傳', date: '08.19', deadline: '8/19 上午 12 點前' },
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    )
  }

  if (error && !reg) {
    return (
      <main className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-icon" style={{ background: 'linear-gradient(135deg,#cf8f6c,#8b4f32)' }}>!</div>
          <h1 className="login-title">無法載入</h1>
          <p className="login-subtitle">{error}</p>
          <a href="/member/dashboard" className="btn btn-primary btn-block">返回學員專區</a>
        </div>
      </main>
    )
  }

  const uploadedCount = Object.values(files).filter(Boolean).length
  const progressClass = uploadedCount === 2 ? 'complete' : uploadedCount === 1 ? 'partial' : ''
  const initial = reg?.chinese_name?.charAt(0) || '?'

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href="/member/dashboard" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Member Portal</small>
              <span>學員專區</span>
            </span>
          </a>
          <div className="nav-actions">
            <a href="/member/dashboard" className="nav-back">← 學員首頁</a>
          </div>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Rapid Test Upload</p>
          <h1 className="page-title">快篩檢測上傳</h1>
          <p className="page-subtitle">
            8/17 與 8/19 兩個時段的快篩結果請於規定時間前上傳；可分次回到此頁補上。<br />
            8/20、8/22 課程期間的快篩結果請於現場繳交。
          </p>
        </div>
      </div>

      <main className="container">
        <div className="layout">
          <div>
            <div className="member-card">
              <div className="avatar">{initial}</div>
              <div className="info">
                <div className="name">{reg.chinese_name} 法友</div>
                <div className="meta">
                  <span><strong>序號</strong>{reg.member_id || '待編號'}</span>
                  {reg.student_id && <span><strong>學號</strong>{reg.student_id}</span>}
                </div>
              </div>
            </div>

            <div className="alert-card">
              <div className="alert-card-title">注意事項</div>
              <ul>
                <li>檢測結果必須<strong>載明檢測日期、序號、姓名</strong>。</li>
                <li>快篩試劑請<strong>自備</strong>，主辦單位不提供。</li>
                <li>請依下方兩個時段於規定時間前上傳；可分次回到此頁補上。</li>
                <li>課程期間的 8/20、8/22 快篩結果<strong>現場繳交</strong>，不需於此上傳。</li>
              </ul>
            </div>

            {(uploadedCount > 0 || lastUpdate) && (
              <div className={`progress-bar ${progressClass}`}>
                <div className="progress-bar-text">
                  已上傳 {uploadedCount}／2 次
                </div>
                {lastUpdate && (
                  <small>最後更新：{new Date(lastUpdate).toLocaleString('zh-TW')}</small>
                )}
              </div>
            )}

            {TESTS.map(t => {
              const url = files[t.key]
              const kind = t.key.replace(/_url$/, '')
              const isImage = url && !url.toLowerCase().endsWith('.pdf')
              const uploading = uploadingKind === kind
              const inputId = `qt-${kind}`
              const filename = url ? url.split('/').pop() || '已上傳檔案' : ''
              return (
                <div key={t.key} className={`test-card ${url ? 'uploaded' : ''}`}>
                  <div className="test-card-head">
                    <div>
                      <div className="test-card-title">{t.label}</div>
                      <div className="test-card-date">{t.deadline}</div>
                    </div>
                    <span className={`test-card-status ${url ? 'uploaded' : 'pending'}`}>
                      {url ? '✓ 已上傳' : '待上傳'}
                    </span>
                  </div>

                  {url && (
                    <div className="uploaded-preview">
                      <div className="thumb">
                        {isImage ? <img src={url} alt={t.label} /> : '📄'}
                      </div>
                      <div className="info">
                        <div className="filename">{filename}</div>
                        <div className="upload-time">已上傳</div>
                      </div>
                      <div className="actions">
                        {isImage && (
                          <span className="view-link" onClick={() => setPreviewUrl(url)}>檢視</span>
                        )}
                        {!isImage && (
                          <a href={url} target="_blank" rel="noreferrer" className="view-link">開啟</a>
                        )}
                        <span className="clear-link" onClick={() => setFiles(prev => ({ ...prev, [t.key]: '' }))}>清除</span>
                      </div>
                    </div>
                  )}

                  <label htmlFor={inputId} className={`upload-box green ${url ? 'has-file' : ''}`}>
                    <div className="upload-icon-big">{uploading ? '⏳' : '📤'}</div>
                    <div className="upload-text">
                      {uploading ? '上傳中⋯' : url ? '點此重新上傳' : '點此選擇快篩照片'}
                    </div>
                    <div className="upload-hint">支援 JPG / PNG / WEBP / PDF（5MB 以下）</div>
                    <input id={inputId} type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(kind, f) }} />
                  </label>
                </div>
              )
            })}

            <div className="onsite-notice">
              <strong>8/20、8/22 課程期間快篩</strong>請於現場繳交，毋須線上上傳。
            </div>

            {done && (
              <div className="submit-status" style={{ marginTop: 18 }}>
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>快篩上傳已收到</h4>
                  <p>系統已寄出確認信至您的 Email。未上傳的時段請於規定時間前回到此頁補上。</p>
                </div>
              </div>
            )}

            {error && (
              <div className="alert-card" style={{ marginTop: 16 }}>
                <div className="alert-card-title">錯誤</div>
                <p>{error}</p>
              </div>
            )}

            <div className="form-actions">
              <a href="/member/dashboard" className="btn btn-ghost">← 返回</a>
              <button onClick={handleSubmit} disabled={submitting || !!uploadingKind}
                className="btn btn-primary">
                {submitting ? '送出中⋯' : '送出 ／ 更新快篩上傳'} <span className="arrow">→</span>
              </button>
            </div>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12.5, color: 'var(--ink-mute)' }}>
              送出後系統會寄確認信。可隨時回到此頁更新。
            </p>
          </div>

          <aside>
            <div className="sidebar-card">
              <h4>快篩時程 <small>Schedule</small></h4>
              <div className="info-row">
                <span className="k">8/17 線上上傳</span>
                <span className="v">{files.test_0817_url ? '✓ 已上傳' : '待上傳'}</span>
              </div>
              <div className="info-row">
                <span className="k">8/19 線上上傳</span>
                <span className="v">{files.test_0819_url ? '✓ 已上傳' : '待上傳'}</span>
              </div>
              <div className="info-row">
                <span className="k">8/20 現場繳交</span>
                <span className="v">於課程現場</span>
              </div>
              <div className="info-row">
                <span className="k">8/22 現場繳交</span>
                <span className="v">於課程現場</span>
              </div>
            </div>

            <div className="sidebar-card">
              <h4>使用說明 <small>How to</small></h4>
              <ol style={{ paddingLeft: 20, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.85 }}>
                <li>請於檢測當下拍下含<strong>檢測日期、序號、姓名</strong>之照片。</li>
                <li>於各時段卡片點擊上傳區，選取照片。</li>
                <li>檔案上傳後可預覽、清除或重新上傳。</li>
                <li>完成後請按下方<strong>送出</strong>，系統會寄出確認信。</li>
              </ol>
            </div>

            <div className="sidebar-card">
              <h4>需要協助 <small>Help</small></h4>
              <p>聯絡學會：<br />
                <a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a>
              </p>
            </div>
          </aside>
        </div>
      </main>

      {previewUrl && (
        <div className="preview-modal show" onClick={() => setPreviewUrl(null)}>
          <button className="close" onClick={() => setPreviewUrl(null)}>✕</button>
          <img src={previewUrl} alt="預覽" />
        </div>
      )}

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處禪修學會　All rights reserved.</div>
          <div><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></div>
        </div>
      </footer>
    </>
  )
}

export default function QuickTestsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    }>
      <QuickTestsContent />
    </Suspense>
  )
}
