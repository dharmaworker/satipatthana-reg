'use client'
import { useRouter, usePathname } from 'next/navigation'

const TABS = [
  { path: '/admin/dashboard', label: '報名管理' },
  { path: '/admin/lodgings', label: '食宿登記' },
  { path: '/admin/documents', label: '所有證件' },
  { path: '/admin/quicktests', label: '快篩上傳' },
]

export function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="bg-green-800 text-white px-6 py-3 flex flex-wrap justify-between items-center gap-3">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold">後台管理｜第二屆台灣四念處禪修</h1>
        <nav className="flex">
          {TABS.map(t => {
            const active = pathname === t.path || pathname?.startsWith(t.path)
            return (
              <button key={t.path}
                onClick={() => router.push(t.path)}
                className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
                  active
                    ? 'bg-white text-green-800 font-semibold'
                    : 'bg-green-700/50 text-green-100 hover:bg-green-700'
                }`}>
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="flex gap-3 items-center text-sm">
        <button onClick={() => router.push('/admin/schedules')}
          className="text-green-200 hover:text-white">⚙️ 自動匯出排程</button>
        <button onClick={() => router.push('/admin')}
          className="text-green-200 hover:text-white">登出</button>
      </div>
    </div>
  )
}
