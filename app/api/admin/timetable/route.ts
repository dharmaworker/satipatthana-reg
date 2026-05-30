import { NextRequest, NextResponse } from 'next/server'
import { fetchTimetable, saveTimetable, type Timetable } from '@/lib/timetable'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }
  const t = await fetchTimetable()
  return NextResponse.json(t)
}

export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }
  let body: Timetable
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '格式錯誤' }, { status: 400 })
  }

  if (!Array.isArray(body.days)) {
    return NextResponse.json({ error: '資料結構不正確' }, { status: 400 })
  }
  // 基本欄位檢查
  for (const d of body.days) {
    if (typeof d.title !== 'string' || !Array.isArray(d.rows)) {
      return NextResponse.json({ error: '日次資料不完整' }, { status: 400 })
    }
    for (const r of d.rows) {
      if (typeof r.time !== 'string' || typeof r.title !== 'string') {
        return NextResponse.json({ error: '時段資料不完整' }, { status: 400 })
      }
    }
  }

  try {
    await saveTimetable(body)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '儲存失敗' }, { status: 500 })
  }
}

// PATCH — 只更新 publish_at
export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })
  const { publish_at } = await request.json()
  try {
    const current = await fetchTimetable()
    await saveTimetable({ ...current, publish_at: publish_at ?? null })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '儲存失敗' }, { status: 500 })
  }
}
