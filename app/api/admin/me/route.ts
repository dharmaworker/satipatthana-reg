import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  const username = request.cookies.get('admin_username')?.value
  if (!role) return NextResponse.json({ error: '未登入' }, { status: 401 })
  return NextResponse.json({ role, username })
}
