'use client'
import { useRouter, usePathname } from 'next/navigation'

const TABS = [
  { path: '/admin/dashboard', label: '報名管理' },
  { path: '/admin/lodgings', label: '錄取學員' },
  { path: '/admin/documents', label: '所有證件' },
  { path: '/admin/quicktests', label: '快篩上傳' },
  { path: '/admin/interactive', label: '互動報名' },
  { path: '/admin/interactive-tasks', label: '互動作業' },
  { path: '/admin/timetable', label: '課程時間表' },
]

export function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="container nav" style={{ flexWrap: 'wrap', minHeight: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/admin/dashboard" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Admin Console</small>
              <span>後台管理</span>
            </span>
          </a>
        </div>

        <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const active = pathname === t.path || (pathname?.startsWith(t.path) && t.path !== '/admin/dashboard')
            const isDashboardActive = pathname === '/admin/dashboard' && t.path === '/admin/dashboard'
            const isActive = active || isDashboardActive
            return (
              <button key={t.path}
                onClick={() => router.push(t.path)}
                style={{
                  padding: '8px 16px',
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

        <div className="nav-actions">
          <button onClick={() => router.push('/admin/schedules')}
            className="nav-back" style={{ background: 'rgba(216, 194, 154, 0.2)' }}>
            ⚙ 自動匯出
          </button>
          <button onClick={() => router.push('/admin')} className="nav-logout">登出</button>
        </div>
      </div>
    </header>
  )
}
