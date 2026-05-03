import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function verifyMember(id: string, code: string) {
  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('id, status')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()
  if (error || !data) return null
  return data
}

// GET /api/member/practice?id=...&code=...
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  const code = url.searchParams.get('code') || ''

  const reg = await verifyMember(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })
  if (reg.status !== 'approved') return NextResponse.json({ error: '僅限錄取學員' }, { status: 403 })

  const [configRes, scheduleRes, checkinsRes] = await Promise.all([
    supabaseAdmin.from('practice_config').select('*').eq('id', 1).single(),
    supabaseAdmin.from('practice_schedule').select('*').eq('enabled', true).order('sort_order'),
    supabaseAdmin.from('practice_checkins').select('schedule_item_id').eq('registration_id', id),
  ])

  if (!configRes.data) return NextResponse.json({ error: '尚未設定' }, { status: 404 })

  const checkedIds = new Set((checkinsRes.data || []).map((c: { schedule_item_id: string }) => c.schedule_item_id))

  return NextResponse.json({
    config: configRes.data,
    items: (scheduleRes.data || []).map((item: Record<string, unknown>) => ({
      ...item,
      checked: checkedIds.has(item.id as string),
    })),
  })
}

// POST /api/member/practice?id=...&code=...  body: { item_id, checked }
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  const code = url.searchParams.get('code') || ''

  const reg = await verifyMember(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })
  if (reg.status !== 'approved') return NextResponse.json({ error: '僅限錄取學員' }, { status: 403 })

  const body = await request.json()
  const { item_id, checked } = body as { item_id: string; checked: boolean }
  if (!item_id) return NextResponse.json({ error: '缺少 item_id' }, { status: 400 })

  if (checked) {
    await supabaseAdmin.from('practice_checkins').upsert(
      { registration_id: id, schedule_item_id: item_id },
      { onConflict: 'registration_id,schedule_item_id' }
    )
  } else {
    await supabaseAdmin.from('practice_checkins')
      .delete()
      .eq('registration_id', id)
      .eq('schedule_item_id', item_id)
  }

  return NextResponse.json({ ok: true })
}
