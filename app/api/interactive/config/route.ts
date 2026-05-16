import { NextResponse } from 'next/server'
import { fetchActiveSessions, fetchActiveSmallSlots, deriveTeachersFromSlots } from '@/lib/interactive-db'
import { fetchInteractiveConfig, resolveDeadlineMs } from '@/lib/interactive-config'

// GET /api/interactive/config
// 公開端點：供學員表單動態載入場次、老師列表與截止時間
export async function GET() {
  const [sessions, slots, config] = await Promise.all([
    fetchActiveSessions(),
    fetchActiveSmallSlots(),
    fetchInteractiveConfig(),
  ])
  const teachers = deriveTeachersFromSlots(slots)
  return NextResponse.json({ sessions, slots, teachers, deadline_ms: resolveDeadlineMs(config) })
}
