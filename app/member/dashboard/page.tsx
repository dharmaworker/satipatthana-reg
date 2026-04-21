'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type MemberData = {
  id: string
  chinese_name: string
  member_id: string | null
  student_id: string | null
  random_code: string
  status: string
  payment_status: string
  payment_plan: string | null
  residence: string | null
  lodging_status: 'none' | 'submitted_editable' | 'locked'
  tests_uploaded: number
  tests_total: number
}

export default function MemberDashboardPage() {
  const router = useRouter()
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/member/me')
      .then(res => {
        if (!res.ok) { router.push('/member'); return }
        return res.json()
      })
      .then(data => { if (data) setMember(data); setLoading(false) })
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>
  if (!member) return null

  const lodgingLabel = member.lodging_status === 'none'
    ? '❌ 尚未送出'
    : member.lodging_status === 'submitted_editable'
    ? '✅ 已送出（還能修改 1 次）'
    : '🔒 已修改過，鎖定'

  const withAuth = (path: string) => `${path}?id=${member.id}&code=${member.random_code}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">學員專區</h1>
          <p className="text-green-200 text-sm">歡迎，{member.chinese_name} 學員</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-green-200">序號</p>
          <p className="font-bold font-mono">{member.member_id || '待編號'}</p>
          {member.student_id && (
            <>
              <p className="text-green-200 mt-1">學號</p>
              <p className="font-bold font-mono">{member.student_id}</p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* 一、狀態一覽 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-6 py-3">
            <h2 className="font-semibold">一、我的狀態</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">審核狀態</div>
              <div className="text-black font-medium">已錄取</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">繳費狀態</div>
              <div className="text-black font-medium">✅ 繳費已確認</div>
            </div>
            {member.payment_plan && (
              <div>
                <div className="text-xs text-gray-500">繳費方案</div>
                <div className="text-black font-medium">{member.payment_plan}</div>
              </div>
            )}
            {member.residence && (
              <div>
                <div className="text-xs text-gray-500">居住地</div>
                <div className="text-black font-medium">{member.residence}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">食宿登記</div>
              <div className="text-black">{lodgingLabel}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">快篩上傳</div>
              <div className="text-black">{member.tests_uploaded}/{member.tests_total}</div>
            </div>
          </div>
        </div>

        {/* 二、後續流程 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-6 py-3">
            <h2 className="font-semibold">二、後續流程</h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-600 px-2">以下流程可平行進行，請依各自截止時間完成。</p>

            <a href={withAuth('/lodging')}
              className={`block w-full rounded-xl p-4 text-white text-center transition-colors ${
                member.lodging_status === 'locked' ? 'bg-gray-500' : 'bg-blue-700 hover:bg-blue-800'
              }`}>
              <div className="font-semibold">
                {member.lodging_status === 'none' ? '① 前往食宿登記' :
                 member.lodging_status === 'submitted_editable' ? '① 食宿登記（可再修改 1 次）' :
                 '🔒 ① 食宿登記已鎖定'}
              </div>
              <div className="text-xs text-blue-100 mt-0.5">截止：6/20 晚上 8 點｜僅能送出並修改 1 次</div>
            </a>

            <a href={withAuth('/quicktests')}
              className="block w-full rounded-xl p-4 text-white text-center bg-purple-700 hover:bg-purple-800 transition-colors">
              <div className="font-semibold">
                ② 快篩上傳（已上傳 {member.tests_uploaded}/{member.tests_total}）
              </div>
              <div className="text-xs text-purple-100 mt-0.5">
                8/17 上午 8–晚上 8、8/19 上午 12 前｜8/20、8/22 現場繳交
              </div>
            </a>

            <p className="text-xs text-gray-500 px-2 pt-2">
              快篩結果需<strong>載明檢測日期、序號、姓名</strong>；快篩試劑請自備。
            </p>
          </div>
        </div>

        {/* 三、公告 / 資訊 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-6 py-3">
            <h2 className="font-semibold">三、公告與資訊</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { title: '課程時間與地點', href: '/info/schedule', ready: true },
              { title: '費用說明與支付方式', href: '/info/payment', ready: true },
              { title: '序號 / 狀態查詢', href: '/query', ready: true },
            ].map(item => (
              <a key={item.title} href={item.href}
                className="flex items-center justify-between px-6 py-4 hover:bg-green-50 cursor-pointer transition-colors">
                <span className="text-black">{item.title}</span>
                <span className="text-sm text-green-700">查看 →</span>
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
