import { NextRequest, NextResponse } from 'next/server'
import { fetchTimetable } from '@/lib/timetable'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const code = url.searchParams.get('code')

  if (!id || !code) {
    return NextResponse.json({ error: '請先登入學員專區', need_login: true }, { status: 401 })
  }

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('status')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()

  if (error || !reg) {
    return NextResponse.json({ error: '無效的存取連結', need_login: true }, { status: 401 })
  }

  if (reg.status !== 'approved') {
    return NextResponse.json({ error: '本頁僅限錄取學員瀏覽', not_approved: true }, { status: 403 })
  }

  const t = await fetchTimetable()
  if (!t.published) {
    return NextResponse.json({ published: false, days: [] })
  }
  return NextResponse.json(t)
}
