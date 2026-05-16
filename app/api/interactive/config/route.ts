import { NextResponse } from 'next/server'
import { fetchActiveSessions, fetchActiveSmallSlots, deriveTeachersFromSlots } from '@/lib/interactive-db'

// GET /api/interactive/config
// 公開端點：供學員表單動態載入場次與老師列表
export async function GET() {
  const [sessions, slots] = await Promise.all([
    fetchActiveSessions(),
    fetchActiveSmallSlots(),
  ])
  const teachers = deriveTeachersFromSlots(slots)
  return NextResponse.json({ sessions, slots, teachers })
}
