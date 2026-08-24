import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchAllRows, fetchRowsByIds } from '@/lib/supabase'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  let tasks: any[]
  try {
    tasks = await fetchAllRows<any>((from, to) => supabaseAdmin
      .from('interactive_tasks')
      .select('*')
      .order('registration_id', { ascending: true })
      .range(from, to))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  if (tasks.length === 0) return NextResponse.json({ data: [] })

  const ids = tasks.map(t => t.registration_id)

  // 依 id 分批查詢：uuid 全塞進查詢字串會超過長度上限，單次查詢也只回 1000 筆
  let regs: any[]
  let ints: any[]
  try {
    regs = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('registrations')
      .select('id, chinese_name, member_id, student_id, random_code, email, gender, identity')
      .in('id', chunk)
      .neq('retreat_format', 'online'))

    ints = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('interactive_registrations')
      .select('*')
      .in('registration_id', chunk))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const regMap = new Map(regs.map(r => [r.id, r]))
  const intMap = new Map(ints.map(i => [i.registration_id, i]))

  const data = tasks.map(t => ({
    task: t,
    registration: regMap.get(t.registration_id) || null,
    interactive: intMap.get(t.registration_id) || null,
  }))

  return NextResponse.json({ data })
}
