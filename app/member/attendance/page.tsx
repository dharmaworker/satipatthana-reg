'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'full', label: '已全程完整參課' },
  { value: 'partial', label: '基本完整參與，缺勤不超過 3 次' },
  { value: 'absent', label: '缺勤超過 3 次以上（不計入參課次數）' },
]

function AttendanceContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const dashboardUrl = id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'

  const [info, setInfo] = useState<{
    chinese_name: string
    student_id: string | null
    phone: string | null
    email: string
    existing: { attendance_status: string; submitted_at: string } | null
  } | null>(null)
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !code) { setError('網址缺少必要參數'); setLoading(false); return }
    fetch(`/api/member/attendance-checkin?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '載入失敗')
        setInfo(data)
        if (data.existing?.attendance_status) setSelected(data.existing.attendance_status)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, code])

  const handleSubmit = async () => {
    if (!selected) { setError('請選擇您的參課情況'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/member/attendance-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, attendance_status: selected }),
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

  return (
    <>
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

      <main className="container" style={{ maxWidth: 680, paddingTop: 36, paddingBottom: 60 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>Attendance</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)', margin: '0 0 6px' }}>課程完成度簽到</h1>
        </div>

        {error && (
          <div style={{ background: 'rgba(184,82,58,0.08)', border: '1px solid rgba(184,82,58,0.3)', borderRadius: 10, padding: '14px 18px', color: '#b8523a', fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {!error && info && !done && (
          <>
            {/* 說明區塊 */}
            <div style={{ background: 'rgba(251, 248, 242, 0.92)', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 10px', lineHeight: 1.75 }}>
                第二屆・台灣四念處禪修之旅簽到表將於 8 月 24 日課程結束後正式開放，並於 <strong style={{ color: 'var(--ink)' }}>8 月 26 日</strong>截止填寫。
              </p>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 10px', lineHeight: 1.75 }}>
                請全程參與或缺勤不超過 3 次的學員，在截止日期前完成簽到，方可計為一次有效參課記錄。
              </p>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.75 }}>
                缺勤超過 3 次者，本屆課程將不計入參課次數，敬請您知悉。
              </p>
            </div>

            {/* 學員資料（自動帶入） */}
            <div style={{ background: 'rgba(251, 248, 242, 0.92)', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>學員資料</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                {[
                  { label: '學號', value: info.student_id || '—' },
                  { label: '中文姓名', value: info.chinese_name },
                  { label: '手機號碼', value: info.phone || '—' },
                  { label: '信箱', value: info.email },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, background: 'var(--bg-deep)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--line)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 參課情況選擇 */}
            <div style={{ background: 'rgba(251, 248, 242, 0.92)', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px', marginBottom: 28, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>請選擇您的參課情況</h3>
              <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 16 }}>（包括早晚課誦）</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <label key={value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', borderRadius: 10, padding: '14px 16px',
                      border: `1px solid ${selected === value ? 'var(--green)' : 'var(--line)'}`,
                      background: selected === value ? 'rgba(73,85,52,0.07)' : 'var(--bg-pure)',
                      transition: 'all 0.15s',
                      fontSize: 14, color: 'var(--ink)', fontWeight: selected === value ? 600 : 400,
                    }}>
                    <input
                      type="radio"
                      name="attendance_status"
                      value={value}
                      checked={selected === value}
                      onChange={() => setSelected(value)}
                      style={{ accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {info.existing && (
              <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 14 }}>
                您已於 {new Date(info.existing.submitted_at).toLocaleString('zh-TW')} 完成簽到，可重新選擇後送出以更新記錄。
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !selected}
              style={{
                width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 700,
                borderRadius: 12, border: 'none', cursor: submitting || !selected ? 'not-allowed' : 'pointer',
                background: selected ? 'var(--green)' : 'var(--line)',
                color: selected ? '#fff' : 'var(--ink-mute)',
                letterSpacing: '0.08em', transition: 'all 0.2s',
              }}>
              {submitting ? '送出中⋯' : info.existing ? '更新簽到' : '確認送出'}
            </button>
          </>
        )}

        {done && (
          <div style={{ background: 'rgba(73,85,52,0.08)', border: '1px solid rgba(73,85,52,0.3)', borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-deep)', marginBottom: 10, letterSpacing: '0.08em' }}>簽到完成</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 8 }}>
              您的參課情況已記錄：<strong style={{ color: 'var(--ink)' }}>{STATUS_OPTIONS.find(o => o.value === selected)?.label}</strong>
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 24 }}>感恩您的護持，祝修學進步，法喜充滿。</p>
            <a href={dashboardUrl}
              style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--green)', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              返回學員專區
            </a>
          </div>
        )}
      </main>
    </>
  )
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner-large" /></div>}>
      <AttendanceContent />
    </Suspense>
  )
}
