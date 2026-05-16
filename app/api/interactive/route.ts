import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchActiveSessions, fetchActiveSmallSlots, deriveTeachersFromSlots } from '@/lib/interactive-db'
import { INTERACTIVE_DEADLINE_MS } from '@/lib/interactive'
import { fetchInteractiveConfig } from '@/lib/interactive-config'
import { sendInteractiveSubmitConfirmEmail } from '@/lib/interactive-invite-email'

async function authMember(id: string | null, code: string | null) {
  if (!id || !code) return { error: '缺少必要參數', status: 400 }

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('id, status, chinese_name, member_id, student_id, gender, identity, email')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()
  if (error || !reg) return { error: '無效的存取連結', status: 401 }
  if (reg.status !== 'approved') return { error: '本頁僅限錄取學員', status: 403 }
  return { reg }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const a = await authMember(searchParams.get('id'), searchParams.get('code'))
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { data: row } = await supabaseAdmin
    .from('interactive_registrations')
    .select('*')
    .eq('registration_id', a.reg.id)
    .maybeSingle()

  const config = await fetchInteractiveConfig()
  const isAdmin = request.cookies.get('admin_role')?.value === 'admin'
  return NextResponse.json({
    registration: a.reg,
    interactive: row,
    deadline: INTERACTIVE_DEADLINE_MS,
    open: config.open || isAdmin,
    preview: isAdmin && !config.open,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  const a = await authMember(body.id ?? null, body.code ?? null)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  if (Date.now() > INTERACTIVE_DEADLINE_MS) {
    return NextResponse.json({ error: '互動報名已截止' }, { status: 400 })
  }

  const wanted_sessions: string[] = Array.isArray(body.wanted_sessions) ? body.wanted_sessions : []
  const wanted_ranking: string[] = Array.isArray(body.wanted_ranking) ? body.wanted_ranking : []

  // 從 DB 取得目前有效的場次與老師清單做驗證
  const [sessions, slots] = await Promise.all([fetchActiveSessions(), fetchActiveSmallSlots()])
  const teachers = deriveTeachersFromSlots(slots)

  const validSessions = new Set(sessions.map(s => s.id))
  if (!wanted_sessions.every(s => validSessions.has(s))) {
    return NextResponse.json({ error: '集體場次選擇不合法' }, { status: 400 })
  }
  const validTeachers = new Set(teachers.map(t => t.key))
  if (wanted_ranking.length > teachers.length) {
    return NextResponse.json({ error: `分組互動最多選 ${teachers.length} 個` }, { status: 400 })
  }
  if (!wanted_ranking.every(t => validTeachers.has(t))) {
    return NextResponse.json({ error: '分組老師選擇不合法' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('interactive_registrations')
    .upsert(
      {
        registration_id: a.reg.id,
        wanted_sessions,
        wanted_ranking,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'registration_id' }
    )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sendInteractiveSubmitConfirmEmail(
    { email: a.reg.email, chinese_name: a.reg.chinese_name, id: a.reg.id, random_code: body.code },
    { wanted_sessions, wanted_ranking }
  ).catch(err => console.error('[interactive] 確認信寄送失敗:', err))

  return NextResponse.json({ success: true })
}
