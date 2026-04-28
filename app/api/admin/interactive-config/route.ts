import { NextRequest, NextResponse } from 'next/server'
import { fetchInteractiveConfig, saveInteractiveConfig } from '@/lib/interactive-config'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  return NextResponse.json(await fetchInteractiveConfig())
}

export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (typeof body.open !== 'boolean') {
    return NextResponse.json({ error: 'open 必須是 boolean' }, { status: 400 })
  }
  try {
    await saveInteractiveConfig({ open: body.open })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '儲存失敗' }, { status: 500 })
  }
}
