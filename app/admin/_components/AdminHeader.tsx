'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const IN_PERSON_ONLY_PATHS = ['/admin/documents', '/admin/quicktests', '/admin/interactive', '/admin/interactive-tasks']
const ONLINE_ONLY_PATHS = ['/admin/attendance-records']

const DATA_TABS = [
  { path: '/admin/dashboard', label: '報名管理', hint: '所有報名資料、審核狀態與寄信', inPersonOnly: false, onlineOnly: false },
  { path: '/admin/lodgings', label: '錄取學員', hint: '錄取名單、學號編排、繳費方案', inPersonOnly: false, onlineOnly: false },
  { path: '/admin/documents', label: '食宿登記', hint: '學員食宿、交通、飲食登記內容', inPersonOnly: true, onlineOnly: false },
  { path: '/admin/quicktests', label: '快篩上傳', hint: '學員快篩照片上傳進度', inPersonOnly: true, onlineOnly: false },
  { path: '/admin/interactive', label: '互動報名', hint: '互動場次抽籤與序號分配', inPersonOnly: true, onlineOnly: false },
  { path: '/admin/interactive-tasks', label: '互動作業', hint: '中簽學員課前作業填寫內容', inPersonOnly: true, onlineOnly: false },
]

const SETTING_TABS = [
  { path: '/admin/timetable', label: '設課程時間表', hint: '五日禪修課程時程安排' },
  { path: '/admin/practice-records', label: '共修打卡', hint: '學員課前共修打卡記錄總覽' },
  { path: '/admin/practice', label: '設課前共修表', hint: '設定課前共修課表與 Zoom 資訊' },
  { path: '/admin/schedule-config', label: '時程設定', hint: '重要時程日期設定（補報名、截止等）' },
]

export function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [formatFilter, setFormatFilter] = useState<'in_person' | 'online'>('in_person')
  const [adminRole, setAdminRole] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/me').then(r => r.json()).then(d => { if (d.role) setAdminRole(d.role) }).catch(() => {})
  }, [])

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
    if (f === 'in_person' && ONLINE_ONLY_PATHS.includes(pathname || '')) {
      router.push('/admin/dashboard')
    }
  }

  const tabs = DATA_TABS.filter(t =>
    !(t.inPersonOnly && formatFilter === 'online') &&
    !(t.onlineOnly && formatFilter === 'in_person')
  )

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

        {adminRole !== 'practice_editor' && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>禪修形式</span>
          {(['in_person', 'online'] as const).map(f => (
            <button key={f}
              onClick={() => handleFormat(f)}
              style={{
                padding: '6px 20px',
                fontSize: 13.5,
                letterSpacing: '0.06em',
                borderRadius: 999,
                border: '1.5px solid ' + (formatFilter === f
                  ? (f === 'online' ? 'rgb(120,201,71)' : 'rgb(255,99,71)')
                  : 'var(--line-strong)'),
                background: formatFilter === f
                  ? (f === 'online' ? 'rgb(120,201,71)' : 'rgb(255,99,71)')
                  : 'rgba(255,255,255,0.5)',
                color: formatFilter === f ? '#f8f2e8' : 'var(--ink-soft)',
                fontWeight: formatFilter === f ? 900 : 600,
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}>
              {f === 'in_person' ? '實體' : '線上'}
            </button>
          ))}
        </div>}

        <div className="nav-actions">
          {adminRole !== 'practice_editor' && <>
          <button onClick={() => router.push('/admin/schedules')}
            className="nav-back" style={{ background: 'rgba(216, 194, 154, 0.2)' }}>
            ⚙ 排程匯出
          </button>
          <button onClick={() => window.open('/api/admin/export-now', '_blank')}
            className="nav-back" style={{ background: 'rgba(216, 194, 154, 0.2)' }}>
            ↓ 匯出
          </button>
          </>}
          <button onClick={() => router.push('/admin')} className="nav-logout">登出</button>
        </div>
      </div>

      {/* Row 2: tabs */}
      <div className="container" style={{ paddingTop: 8, paddingBottom: 10, borderTop: '1px solid var(--line)' }}>
        <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 學員資料操作（practice_editor 不顯示） */}
          {adminRole !== 'practice_editor' && tabs.map(t => {
            const active = pathname === t.path || (pathname?.startsWith(t.path) && t.path !== '/admin/dashboard')
            const isDashboardActive = pathname === '/admin/dashboard' && t.path === '/admin/dashboard'
            const isActive = active || isDashboardActive
            return (
              <button key={t.path}
                onClick={() => router.push(t.path)}
                title={t.hint}
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

          {/* 分隔線（practice_editor 不顯示） */}
          {adminRole !== 'practice_editor' && <div style={{ width: 1, height: 24, background: 'var(--line-strong)', margin: '0 6px', flexShrink: 0 }} />}

          {/* 設課程簽到（線上專用，practice_editor 不顯示） */}
          {adminRole !== 'practice_editor' && formatFilter === 'online' && (() => {
            const path = '/admin/attendance-records'
            const isActive = pathname === path
            return (
              <button key={path} onClick={() => router.push(path)} title="線上學員課程完成度簽到記錄"
                style={{
                  padding: '7px 16px', fontSize: 13.5, fontWeight: 600, letterSpacing: '0.06em', borderRadius: 999,
                  border: '1px solid ' + (isActive ? 'var(--gold-deep)' : 'var(--line-strong)'),
                  background: isActive ? 'var(--gold-deep)' : 'rgba(216, 194, 154, 0.15)',
                  color: isActive ? '#f8f2e8' : 'var(--ink-soft)', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                設課程簽到
              </button>
            )
          })()}

          {/* 課表設定（practice_editor 只顯示「設課前共修表」） */}
          {SETTING_TABS.filter(t => adminRole === 'practice_editor' ? t.path === '/admin/practice' : true).map(t => {
            const isActive = pathname === t.path
            return (
              <button key={t.path}
                onClick={() => router.push(t.path)}
                title={t.hint}
                style={{
                  padding: '7px 16px',
                  fontSize: 13.5, fontWeight: 600,
                  letterSpacing: '0.06em',
                  borderRadius: 999,
                  border: '1px solid ' + (isActive ? 'var(--gold-deep)' : 'var(--line-strong)'),
                  background: isActive ? 'var(--gold-deep)' : 'rgba(216, 194, 154, 0.15)',
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
