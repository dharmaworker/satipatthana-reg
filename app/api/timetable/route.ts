import { NextResponse } from 'next/server'
import { fetchTimetable } from '@/lib/timetable'

export async function GET() {
  const t = await fetchTimetable()
  if (!t.published) {
    return NextResponse.json({ published: false, days: [] })
  }
  return NextResponse.json(t)
}
