import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_CHANGES = 3

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
    supabaseAdmin.from('practice_checkins')
      .select('schedule_item_id, checked, change_count')
      .eq('registration_id', id),
  ])

  if (!configRes.data) return NextResponse.json({ error: '尚未設定' }, { status: 404 })

  const checkinMap = new Map(
    (checkinsRes.data || []).map((c: any) => [c.schedule_item_id, c])
  )

  return NextResponse.json({
    config: configRes.data,
    items: (scheduleRes.data || []).map((item: any) => {
      const c = checkinMap.get(item.id)
      return {
        ...item,
        checked: c?.checked ?? false,
        change_count: c?.change_count ?? 0,
      }
    }),
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

  // 取得目前修改次數
  const { data: existing } = await supabaseAdmin
    .from('practice_checkins')
    .select('change_count')
    .eq('registration_id', id)
    .eq('schedule_item_id', item_id)
    .maybeSingle()

  const currentCount = existing?.change_count ?? 0
  if (currentCount >= MAX_CHANGES) {
    return NextResponse.json({ error: `已達修改上限（${MAX_CHANGES} 次）` }, { status: 400 })
  }

  const newCount = currentCount + 1

  const { error } = await supabaseAdmin.from('practice_checkins').upsert(
    { registration_id: id, schedule_item_id: item_id, checked, change_count: newCount },
    { onConflict: 'registration_id,schedule_item_id' }
  )
  if (error) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })

  return NextResponse.json({ ok: true, change_count: newCount })
}
