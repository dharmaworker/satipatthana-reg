import { NextRequest, NextResponse } from 'next/server'
import { fetchInteractiveConfig, saveInteractiveConfig, resolveDeadlineMs } from '@/lib/interactive-config'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const config = await fetchInteractiveConfig()
  return NextResponse.json({ ...config, deadline_ms: resolveDeadlineMs(config) })
}

// PUT body 可含 open?: boolean  /  deadline_ms?: number（任一或兩者）
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (body.open !== undefined && typeof body.open !== 'boolean') {
    return NextResponse.json({ error: 'open 必須是 boolean' }, { status: 400 })
  }
  if (body.deadline_ms !== undefined && (typeof body.deadline_ms !== 'number' || body.deadline_ms <= 0)) {
    return NextResponse.json({ error: 'deadline_ms 必須是正整數（UTC epoch ms）' }, { status: 400 })
  }
  const msFields = ['task_open_ms', 'task_deadline_ms'] as const
  for (const f of msFields) {
    if (body[f] !== undefined && (typeof body[f] !== 'number' || body[f] <= 0)) {
      return NextResponse.json({ error: `${f} 必須是正整數（UTC epoch ms）` }, { status: 400 })
    }
  }
  try {
    const current = await fetchInteractiveConfig()
    const merged = { ...current }
    if (body.open !== undefined) merged.open = body.open
    if (body.open_ms !== undefined) merged.open_ms = body.open_ms
    if (body.deadline_ms !== undefined) merged.deadline_ms = body.deadline_ms
    if (body.task_open_ms !== undefined) merged.task_open_ms = body.task_open_ms
    if (body.task_deadline_ms !== undefined) merged.task_deadline_ms = body.task_deadline_ms
    await saveInteractiveConfig(merged)
    return NextResponse.json({ success: true, deadline_ms: resolveDeadlineMs(merged), task_open_ms: merged.task_open_ms, task_deadline_ms: merged.task_deadline_ms })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '儲存失敗' }, { status: 500 })
  }
}
