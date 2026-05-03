'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const IN_PERSON_ONLY_PATHS = ['/admin/documents', '/admin/quicktests', '/admin/interactive', '/admin/interactive-tasks']

const ALL_TABS = [
  { path: '/admin/dashboard', label: '報名管理', onlineOnly: false },
  { path: '/admin/lodgings', label: '錄取學員', onlineOnly: false },
  { path: '/admin/documents', label: '食宿登記', onlineOnly: false, inPersonOnly: true },
  { path: '/admin/quicktests', label: '快篩上傳', onlineOnly: false, inPersonOnly: true },
  { path: '/admin/interactive', label: '互動報名', onlineOnly: false, inPersonOnly: true },
  { path: '/admin/interactive-tasks', label: '互動作業', onlineOnly: false, inPersonOnly: true },
  { path: '/admin/timetable', label: '課程時間表', onlineOnly: false },
  { path: '/admin/practice', label: '課前共修', onlineOnly: false },
  { path: '/admin/practice-records', label: '共修打卡', onlineOnly: false },
]

export function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [formatFilter, setFormatFilter] = useState<'in_person' | 'online'>('in_person')

  useEffect(() => {
    const saved = localStorage.getItem('admin_format') as 'in_person' | 'online' | null
    if (saved === 'in_person' || saved === 'online') setFormatFilter(saved)
  }, [])

  const handleFormat = (f: 'in_person' | 'online') => {
    setFormatFilter(f)
    localStorage.setItem('admin_format', f)
    window.dispatchEvent(new CustomEvent('admin-format-change', { detail: f }))
    if (f === 'online' && IN_PERSON_ONLY_PATHS.includes(pathname || '')) {
      router.push('/admin/dashboard')
    }
  }

  const tabs = ALL_TABS.filter(t => !(t.inPersonOnly && formatFilter === 'online'))

  return (
    <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Row 1: brand + format toggle + actions */}
      <div className="container nav" style={{ flexWrap: 'wrap', minHeight: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/admin/dashboard" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Admin Console</small>
              <span>後台管理</span>
            </span>
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>禪修形式</span>
          {(['in_person', 'online'] as const).map(f => (
            <button key={f}
              onClick={() => handleFormat(f)}
              style={{
                padding: '6px 20px',
                fontSize: 13.5, fontWeight: 700,
                letterSpacing: '0.06em',
                borderRadius: 999,
                border: '1.5px solid ' + (formatFilter === f
                  ? (f === 'online' ? 'var(--green)' : 'var(--gold)')
                  : 'var(--line-strong)'),
                background: formatFilter === f
                  ? (f === 'online' ? 'var(--green)' : 'var(--gold-deep)')
                  : 'rgba(255,255,255,0.5)',
                color: formatFilter === f ? '#f8f2e8' : 'var(--ink-soft)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}>
              {f === 'in_person' ? '實體' : '線上'}
            </button>
          ))}
        </div>

        <div className="nav-actions">
          <button onClick={() => router.push('/admin/schedules')}
            className="nav-back" style={{ background: 'rgba(216, 194, 154, 0.2)' }}>
            ⚙ 排程匯出
          </button>
          <button onClick={() => window.open('/api/admin/export-now', '_blank')}
            className="nav-back" style={{ background: 'rgba(216, 194, 154, 0.2)' }}>
            ↓ 匯出
          </button>
          <button onClick={() => router.push('/admin')} className="nav-logout">登出</button>
        </div>
      </div>

      {/* Row 2: tabs */}
      <div className="container" style={{ paddingTop: 8, paddingBottom: 10, borderTop: '1px solid var(--line)' }}>
        <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tabs.map(t => {
            const active = pathname === t.path || (pathname?.startsWith(t.path) && t.path !== '/admin/dashboard')
            const isDashboardActive = pathname === '/admin/dashboard' && t.path === '/admin/dashboard'
            const isActive = active || isDashboardActive
            return (
              <button key={t.path}
                onClick={() => router.push(t.path)}
                style={{
                  padding: '7px 16px',
                  fontSize: 13.5, fontWeight: 600,
                  letterSpacing: '0.06em',
                  borderRadius: 999,
                  border: '1px solid ' + (isActive ? 'var(--green)' : 'var(--line-strong)'),
                  background: isActive ? 'var(--green)' : 'rgba(255, 255, 255, 0.5)',
                  color: isActive ? '#f8f2e8' : 'var(--ink-soft)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
