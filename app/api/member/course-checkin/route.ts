import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function verifyMember(id: string, code: string) {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('id, status, retreat_format')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()
  return data
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  const code = url.searchParams.get('code') || ''

  const reg = await verifyMember(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })
  if (reg.status !== 'approved') return NextResponse.json({ error: '僅限錄取學員' }, { status: 403 })
  if (reg.retreat_format !== 'online') return NextResponse.json({ error: '僅限線上學員' }, { status: 403 })

  const [sessionsRes, checkinsRes] = await Promise.all([
    supabaseAdmin
      .from('course_sessions')
      .select('id, day_number, session_date, time_label, title, sort_order')
      .eq('requires_checkin', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('course_session_checkins')
      .select('session_id, status, checked_in_at')
      .eq('registration_id', id),
  ])

  const checkinMap = new Map((checkinsRes.data || []).map((c: any) => [c.session_id, c]))

  const sessions = (sessionsRes.data || []).map((s: any) => {
    const c = checkinMap.get(s.id)
    return { ...s, status: c?.status ?? null, checked_in_at: c?.checked_in_at ?? null }
  })

  return NextResponse.json({ sessions })
}

export async function POST(request: NextRequest) {
  const { id, code, session_id, status } = await request.json()

  const reg = await verifyMember(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })
  if (reg.status !== 'approved') return NextResponse.json({ error: '僅限錄取學員' }, { status: 403 })
  if (reg.retreat_format !== 'online') return NextResponse.json({ error: '僅限線上學員' }, { status: 403 })

  if (status !== null && !['present', 'absent'].includes(status)) {
    return NextResponse.json({ error: '無效狀態' }, { status: 400 })
  }

  if (status === null) {
    // 清除記錄
    await supabaseAdmin
      .from('course_session_checkins')
      .delete()
      .eq('session_id', session_id)
      .eq('registration_id', id)
  } else {
    const { error } = await supabaseAdmin
      .from('course_session_checkins')
      .upsert(
        {
          session_id,
          registration_id: id,
          status,
          checked_in: status === 'present',
          checked_in_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,registration_id' },
      )
    if (error) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
