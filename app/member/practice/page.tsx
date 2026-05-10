'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type PracticeItem = {
  id: string
  sort_order: number
  session_date: string
  time_label: string
  title: string
  subtitle: string | null
  is_live: boolean
  enabled: boolean
  video_url: string | null
  checked: boolean
}

type PracticeConfig = {
  enabled: boolean
  period_label: string
  zoom_meeting_id: string
  zoom_password: string
  zoom_url: string | null
  notes: string | null
}

function weekLabel(date: string) {
  const start = new Date('2026-07-02')
  const d = new Date(date)
  const week = Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  return `第 ${week} 週`
}

function formatDate(date: string) {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${m}/${day}（${weekdays[d.getDay()]}）`
}

function PracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const dashboardUrl = id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'

  const [config, setConfig] = useState<PracticeConfig | null>(null)
  const [items, setItems] = useState<PracticeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 2000)
  }

  useEffect(() => {
    if (!id || !code) { setError('網址缺少必要參數'); setLoading(false); return }
    fetch(`/api/member/practice?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '載入失敗')
        setConfig(data.config)
        setItems(data.items)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, code])

  const toggle = async (item: PracticeItem) => {
    const next = !item.checked
    setToggling(item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i))
    try {
      const res = await fetch(`/api/member/practice?id=${id}&code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, checked: next }),
      })
      if (res.ok) {
        showToast(next ? '打卡成功' : '已取消打卡', true)
      } else {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i))
        showToast('儲存失敗，請再試一次', false)
      }
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i))
      showToast('網路錯誤，請再試一次', false)
    } finally {
      setToggling(null)
    }
  }

  const checkedCount = items.filter(i => i.checked).length

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          color: toast.ok ? '#166534' : '#991b1b',
          border: `1.5px solid ${toast.ok ? '#86efac' : '#fca5a5'}`,
          padding: '10px 22px', borderRadius: 999,
          fontSize: 14, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          whiteSpace: 'nowrap',
        }}>
          {toast.message}
        </div>
      )}

      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
        <div className="page-blob b4" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href={dashboardUrl} className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Member Portal</small>
              <span>學員專區</span>
            </span>
          </a>
          <div className="nav-actions">
            <a href={dashboardUrl} className="nav-back">← 學員專區</a>
            <button className="nav-logout" onClick={() => router.push('/member')}>登出</button>
          </div>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 780, paddingTop: 36, paddingBottom: 60 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>Pre-Retreat</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)', margin: '0 0 6px' }}>課前共修</h1>
          {config && (
            <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>共修期間：{config.period_label}</p>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 10, padding: '14px 18px', color: '#b8523a', fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {!error && config && (
          <>
            {/* 備注說明 */}
            {config.notes && (
              <div style={{
                background: 'rgba(73,85,52,0.06)',
                border: '1px solid rgba(73,85,52,0.18)',
                borderRadius: 14,
                padding: '16px 24px',
                marginBottom: 28,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{config.notes}</p>
              </div>
            )}

            {/* 打卡進度 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>打卡進度</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: checkedCount === items.length && items.length > 0 ? 'var(--green)' : 'var(--ink)' }}>
                {checkedCount} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-mute)' }}>/ {items.length}</span>
              </span>
              {checkedCount === items.length && items.length > 0 && (
                <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✦ 全部完成</span>
              )}
            </div>

            {/* 課表 */}
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-strong)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: 'var(--bg-pure)' }}>
                <thead>
                  <tr style={{ background: 'rgba(73,85,52,0.07)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: 13, letterSpacing: '0.06em', width: 68 }}>週次</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: 13, letterSpacing: '0.06em', width: 130 }}>日期 / 時間</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: 13, letterSpacing: '0.06em' }}>課程內容</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--ink)', fontSize: 13, letterSpacing: '0.06em', width: 72 }}>打卡</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}
                      style={{
                        borderTop: '1px solid var(--line)',
                        background: item.checked ? 'rgba(73,85,52,0.04)' : undefined,
                        transition: 'background 0.15s',
                      }}>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-mute)', fontSize: 13, fontWeight: 600 }}>
                        {weekLabel(item.session_date)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>{formatDate(item.session_date)}</div>
                        <div style={{ color: 'var(--ink-mute)', fontSize: 12.5, marginTop: 2 }}>{item.time_label}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <>
                          {item.video_url ? (
                            <a href={item.video_url} target="_blank" rel="noreferrer"
                              className="practice-video-link">
                              {item.is_live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 1.5s infinite', marginRight: 6, verticalAlign: 'middle' }} />}
                              {item.title}
                              <span style={{ fontSize: 13, opacity: 0.6 }}>↗</span>
                            </a>
                          ) : (
                            <div style={{ fontWeight: 600, color: 'var(--ink)', lineHeight: 1.5 }}>
                              {item.is_live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 1.5s infinite', marginRight: 6, verticalAlign: 'middle' }} />}
                              {item.title}
                            </div>
                          )}
                          {item.subtitle && <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 2 }}>{item.subtitle}</div>}
                        </>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggle(item)}
                          disabled={toggling === item.id}
                          aria-label={item.checked ? '取消打卡' : '打卡'}
                          style={{
                            width: 32, height: 32,
                            borderRadius: '50%',
                            border: item.checked ? '2px solid var(--green)' : '2px solid var(--line-strong)',
                            background: item.checked ? 'var(--green)' : 'transparent',
                            color: item.checked ? '#f8f2e8' : 'var(--ink-mute)',
                            fontSize: 16,
                            cursor: toggling === item.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            opacity: toggling === item.id ? 0.5 : 1,
                            transition: 'all 0.18s',
                          }}>
                          {item.checked ? '✓' : ''}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--ink-mute)', textAlign: 'center', lineHeight: 1.7 }}>
              每次共修結束後請點擊 ○ 完成打卡。打卡記錄自動儲存。
            </p>
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '32px 16px 48px', color: 'var(--ink-mute)', fontSize: 12.5 }}>
        <img src="/webpage/logo.webp" alt="" style={{ height: 28, opacity: 0.35, display: 'block', margin: '0 auto 10px' }} />
        © 2026 台灣四念處學會
      </footer>
    </>
  )
}

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeContent />
    </Suspense>
  )
}
