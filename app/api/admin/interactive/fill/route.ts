import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchActiveSessions, fetchActiveSmallSlots, deriveTeachersFromSlots } from '@/lib/interactive-db'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

// POST /api/admin/interactive/fill  { registration_id, wanted_sessions[], wanted_ranking[] }
// 後台代學員填寫互動報名志願（集體場次 + 分組意願排序）。
// 用於「未送出」或需協助的學員；填完仍需抽籤 / 編輯指定。
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const registration_id: string | undefined = body.registration_id
  const wanted_sessions: string[] = Array.isArray(body.wanted_sessions) ? body.wanted_sessions : []
  const wanted_ranking: string[] = Array.isArray(body.wanted_ranking) ? body.wanted_ranking : []

  if (!registration_id) return NextResponse.json({ error: '缺少 registration_id' }, { status: 400 })

  // 確認為錄取的實體學員（互動報名僅實體）
  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('id, status, retreat_format')
    .eq('id', registration_id)
    .single()
  if (!reg) return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })
  if (reg.status !== 'approved') return NextResponse.json({ error: '僅限錄取學員' }, { status: 400 })
  if (reg.retreat_format === 'online') return NextResponse.json({ error: '線上學員無互動報名' }, { status: 400 })

  // 驗證場次與老師
  const [sessions, slots] = await Promise.all([fetchActiveSessions(), fetchActiveSmallSlots()])
  const teachers = deriveTeachersFromSlots(slots)
  const validSessions = new Set(sessions.map(s => s.id))
  const filteredSessions = wanted_sessions.filter(s => validSessions.has(s))

  const validTeachers = new Set(teachers.map(t => t.key))
  if (wanted_ranking.length > teachers.length) {
    return NextResponse.json({ error: `分組互動最多選 ${teachers.length} 個` }, { status: 400 })
  }
  if (!wanted_ranking.every(t => validTeachers.has(t))) {
    return NextResponse.json({ error: '分組老師選擇不合法' }, { status: 400 })
  }
  if (new Set(wanted_ranking).size !== wanted_ranking.length) {
    return NextResponse.json({ error: '分組老師選擇有重複' }, { status: 400 })
  }

  // 已有 row → 只更新志願（保留既有抽籤狀態/指定）；沒有 → 新建（狀態 pending）
  const { data: existing } = await supabaseAdmin
    .from('interactive_registrations')
    .select('registration_id')
    .eq('registration_id', registration_id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('interactive_registrations')
      .update({ wanted_sessions: filteredSessions, wanted_ranking, updated_at: new Date().toISOString() })
      .eq('registration_id', registration_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('interactive_registrations')
      .insert({
        registration_id,
        wanted_sessions: filteredSessions,
        wanted_ranking,
        group_status: 'pending',
        small_status: 'pending',
        updated_at: new Date().toISOString(),
      })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
