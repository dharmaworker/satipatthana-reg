import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_CHANGES = 3

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
      .select('session_id, status, checked_in_at, change_count')
      .eq('registration_id', id),
  ])

  const checkinMap = new Map((checkinsRes.data || []).map((c: any) => [c.session_id, c]))

  const sessions = (sessionsRes.data || []).map((s: any) => {
    const c = checkinMap.get(s.id)
    return {
      ...s,
      status: c?.status ?? null,
      checked_in_at: c?.checked_in_at ?? null,
      change_count: c?.change_count ?? 0,
    }
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

  // 取得目前記錄的修改次數
  const { data: existing } = await supabaseAdmin
    .from('course_session_checkins')
    .select('change_count')
    .eq('session_id', session_id)
    .eq('registration_id', id)
    .maybeSingle()

  const currentCount = existing?.change_count ?? 0

  if (currentCount >= MAX_CHANGES) {
    return NextResponse.json({ error: `已達修改上限（${MAX_CHANGES} 次）` }, { status: 400 })
  }

  const newCount = currentCount + 1

  if (status === null) {
    if (!existing) return NextResponse.json({ ok: true })
    // 清除狀態但保留修改次數
    const { error } = await supabaseAdmin
      .from('course_session_checkins')
      .update({ status: null, checked_in: false, checked_in_at: null, change_count: newCount })
      .eq('session_id', session_id)
      .eq('registration_id', id)
    if (error) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
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
          change_count: newCount,
        },
        { onConflict: 'session_id,registration_id' },
      )
    if (error) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, change_count: newCount })
}
