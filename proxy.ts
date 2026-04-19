import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Edge proxy：擋下未授權直接輸入網址進入後台頁面的行為（Next.js 16 起 middleware 改名為 proxy）
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const adminRole = request.cookies.get('admin_role')?.value

  // /admin/login 是登入頁本身，需要允許所有人存取
  if (pathname === '/admin/login') return NextResponse.next()

  // 其他 /admin/* 頁面必須已登入
  if (!adminRole) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // /admin/schedules 僅限 admin 角色
  if (pathname.startsWith('/admin/schedules') && adminRole !== 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // 只對前台後台頁面跑，API routes 各自有檢查
  matcher: ['/admin/:path*'],
}
