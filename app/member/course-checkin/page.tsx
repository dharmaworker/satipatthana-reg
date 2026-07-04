'use client'
import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// 課程打卡已整合進「課程時間表」頁（/info/schedule）。
// 保留此路由做轉址，讓已寄出的舊信連結仍可正常運作。
function Redirect() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  useEffect(() => {
    const target = id && code
      ? `/info/schedule?id=${id}&code=${encodeURIComponent(code)}`
      : '/member'
    router.replace(target)
  }, [id, code, router])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="spinner-large" />
    </div>
  )
}

export default function CourseCheckinRedirectPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    }>
      <Redirect />
    </Suspense>
  )
}
