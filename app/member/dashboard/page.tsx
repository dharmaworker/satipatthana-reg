'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MemberDashboardPage() {
  const router = useRouter()
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/member/me')
      .then(res => {
        if (!res.ok) {
          router.push('/member')
          return
        }
        return res.json()
      })
      .then(data => {
        if (data) setMember(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">學員專區</h1>
          <p className="text-green-200 text-sm">歡迎，{member?.chinese_name} 學員</p>
        </div>
        <div className="text-right">
          <p className="text-green-200 text-sm">序號</p>
          <p className="font-bold">{member?.member_id || '待編號'}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* 一、公告 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-6 py-3">
            <h2 className="font-semibold">一、公告</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { title: '課程時間與地點', href: '/info/schedule', ready: true },
              { title: '費用說明與支付方式', href: '/info/payment', ready: true },
              { title: '住宿安排與細則', href: '/member/info/accommodation', ready: false },
              { title: '餐飲特別說明', href: '/member/info/meals', ready: false },
              { title: '購票建議與接送服務', href: '/member/info/transport', ready: false },
              { title: '證件簽證與保險指南', href: '/member/info/visa', ready: false },
            ].map(item => (
              <a key={item.title} href={item.ready ? item.href : '#'}
                className={`flex items-center justify-between px-6 py-4 transition-colors
                  ${item.ready ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default opacity-50'}`}>
                <span className="text-black">{item.title}</span>
                <span className="text-sm">
                  {item.ready
                    ? <span className="text-green-700">查看 →</span>
                    : <span className="text-gray-400">即將更新</span>}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* 二、資訊查詢 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-6 py-3">
            <h2 className="font-semibold">二、資訊查詢</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { title: '日程安排', href: '/member/info/agenda', ready: false },
              { title: '學號查詢', href: '/query', ready: true },
              { title: '互動抽籤結果', href: '/member/info/lottery', ready: false },
              { title: '承諾書', href: '/member/info/commitment', ready: false },
            ].map(item => (
              <a key={item.title} href={item.ready ? item.href : '#'}
                className={`flex items-center justify-between px-6 py-4 transition-colors
                  ${item.ready ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default opacity-50'}`}>
                <span className="text-black">{item.title}</span>
                <span className="text-sm">
                  {item.ready
                    ? <span className="text-green-700">查看 →</span>
                    : <span className="text-gray-400">即將更新</span>}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* 三、資訊填報 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-6 py-3">
            <h2 className="font-semibold">三、資訊填報</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { title: '個人資訊、食宿與互動報名表', href: '/member/forms/personal', ready: false },
              { title: '行程資訊登記表', href: '/member/forms/travel', ready: false },
              { title: '互動作業提交表', href: '/member/forms/homework', ready: false },
            ].map(item => (
              <a key={item.title} href={item.ready ? item.href : '#'}
                className={`flex items-center justify-between px-6 py-4 transition-colors
                  ${item.ready ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default opacity-50'}`}>
                <span className="text-black">{item.title}</span>
                <span className="text-sm">
                  {item.ready
                    ? <span className="text-green-700">查看 →</span>
                    : <span className="text-gray-400">即將更新</span>}
                </span>
              </a>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            document.cookie = 'member_email=; Max-Age=0'
            document.cookie = 'member_id=; Max-Age=0'
            router.push('/member')
          }}
          className="w-full text-center text-sm text-gray-500 hover:text-red-500 py-2">
          登出
        </button>

      </div>
    </div>
  )
}