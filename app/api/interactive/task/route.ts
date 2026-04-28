import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

  // 必須先送出互動報名，才能填互動作業
  const { data: it } = await supabaseAdmin
    .from('interactive_registrations')
    .select('*')
    .eq('registration_id', reg.id)
    .maybeSingle()
  if (!it) {
    return { error: '請先完成互動報名', status: 403, noRegistration: true }
  }

  return { reg, it }
}

export async function GET(request: NextRequest) {
  const a = await authMember(request)
  if ('error' in a) return NextResponse.json({ error: a.error, noRegistration: (a as any).noRegistration || false }, { status: a.status })

  const { data: task } = await supabaseAdmin
    .from('interactive_tasks')
    .select('*')
    .eq('registration_id', a.reg.id)
    .maybeSingle()

  return NextResponse.json({ registration: a.reg, interactive: a.it, task })
}

export async function POST(request: NextRequest) {
  const a = await authMember(request)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const body = await request.json().catch(() => ({}))
  const fields = {
    learning_duration: (body.learning_duration || '').toString().trim() || null,
    formal_practice: (body.formal_practice || '').toString().trim() || null,
    daily_practice: (body.daily_practice || '').toString().trim() || null,
    group_prior_interaction: (body.group_prior_interaction || '').toString().trim() || null,
    group_question: (body.group_question || '').toString().slice(0, 75).trim() || null,
    small_prior_interaction: (body.small_prior_interaction || '').toString().trim() || null,
    small_question: (body.small_question || '').toString().slice(0, 75).trim() || null,
  }

  // 基本資料必填
  if (!fields.learning_duration || !fields.formal_practice || !fields.daily_practice) {
    return NextResponse.json({ error: '基本資料 Q5 / Q6 / Q7 為必填' }, { status: 400 })
  }
  // 有報名集體（且未沒中簽）→ 集體欄位必填
  const wantsGroup = (a.it.wanted_sessions || []).length > 0 && a.it.group_status !== 'lost'
  if (wantsGroup) {
    if (!fields.group_prior_interaction || !fields.group_question) {
      return NextResponse.json({ error: '集體互動 Q9 / Q10 為必填' }, { status: 400 })
    }
  }
  // 有報名分組（且未沒中簽）→ 分組欄位必填
  const wantsSmall = (a.it.wanted_ranking || []).length > 0 && a.it.small_status !== 'lost'
  if (wantsSmall) {
    if (!fields.small_prior_interaction || !fields.small_question) {
      return NextResponse.json({ error: '分組互動 Q13 / Q15 為必填' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('interactive_tasks')
    .upsert(
      { registration_id: a.reg.id, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'registration_id' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
