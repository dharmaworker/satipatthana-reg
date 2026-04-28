import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SESSIONS, TEACHERS, INTERACTIVE_DEADLINE_MS } from '@/lib/interactive'
import { fetchInteractiveConfig } from '@/lib/interactive-config'

// 驗證 id+code 並確認 status=approved，回 registration row
async function authMember(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const code = url.searchParams.get('code')
  const body = (request.method !== 'GET') ? await request.clone().json().catch(() => null) : null
  const finalId = id || body?.id
  const finalCode = code || body?.code
  if (!finalId || !finalCode) return { error: '缺少必要參數', status: 400 }

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('id, status, chinese_name, member_id, gender, identity, email')
    .eq('id', finalId)
    .eq('random_code', finalCode.toUpperCase().trim())
    .single()
  if (error || !reg) return { error: '無效的存取連結', status: 401 }
  if (reg.status !== 'approved') return { error: '本頁僅限錄取學員', status: 403 }
  return { reg }
}

export async function GET(request: NextRequest) {
  const a = await authMember(request)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { data: row } = await supabaseAdmin
    .from('interactive_registrations')
    .select('*')
    .eq('registration_id', a.reg.id)
    .maybeSingle()

  const config = await fetchInteractiveConfig()
  return NextResponse.json({
    registration: a.reg,
    interactive: row,
    deadline: INTERACTIVE_DEADLINE_MS,
    open: config.open,
  })
}

export async function POST(request: NextRequest) {
  const a = await authMember(request)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const config = await fetchInteractiveConfig()
  if (!config.open) {
    return NextResponse.json({ error: '互動報名尚未開放' }, { status: 400 })
  }
  if (Date.now() > INTERACTIVE_DEADLINE_MS) {
    return NextResponse.json({ error: '互動報名已截止' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const wanted_sessions: string[] = Array.isArray(body.wanted_sessions) ? body.wanted_sessions : []
  const wanted_ranking: string[] = Array.isArray(body.wanted_ranking) ? body.wanted_ranking : []

  // 驗證 sessions / ranking 內容合法
  const validSessions = new Set(SESSIONS.map(s => s.id))
  if (!wanted_sessions.every(s => validSessions.has(s as any))) {
    return NextResponse.json({ error: '集體場次選擇不合法' }, { status: 400 })
  }
  const validTeachers = new Set(TEACHERS.map(t => t.id))
  if (wanted_ranking.length > 0) {
    if (wanted_ranking.length !== 4) {
      return NextResponse.json({ error: '分組互動需排序 4 位老師' }, { status: 400 })
    }
    if (!wanted_ranking.every(t => validTeachers.has(t as any))) {
      return NextResponse.json({ error: '分組老師選擇不合法' }, { status: 400 })
    }
    if (new Set(wanted_ranking).size !== 4) {
      return NextResponse.json({ error: '分組老師不可重複' }, { status: 400 })
    }
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
  return NextResponse.json({ success: true })
}
