import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const { data: tasks, error } = await supabaseAdmin
    .from('interactive_tasks')
    .select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!tasks || tasks.length === 0) return NextResponse.json({ data: [] })

  const ids = tasks.map(t => t.registration_id)

  const { data: regs } = await supabaseAdmin
    .from('registrations')
    .select('id, chinese_name, member_id, student_id, random_code, email, gender, identity')
    .in('id', ids)
    .neq('retreat_format', 'online')

  const { data: ints } = await supabaseAdmin
    .from('interactive_registrations')
    .select('*')
    .in('registration_id', ids)

  const regMap = new Map((regs || []).map(r => [r.id, r]))
  const intMap = new Map((ints || []).map(i => [i.registration_id, i]))

  const data = tasks.map(t => ({
    task: t,
    registration: regMap.get(t.registration_id) || null,
    interactive: intMap.get(t.registration_id) || null,
  }))

  return NextResponse.json({ data })
}
