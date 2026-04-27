import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendInteractiveNotificationEmail } from '@/lib/interactive-notify-email'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  if (ids.length === 0) return NextResponse.json({ error: '未選擇對象' }, { status: 400 })

  // 取互動報名 + 學員 email
  const { data: ints } = await supabaseAdmin
    .from('interactive_registrations')
    .select('*')
    .in('registration_id', ids)
  const intMap = new Map((ints || []).map(i => [i.registration_id, i]))

  const { data: regs } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, random_code')
    .in('id', ids)

  let ok = 0, failed = 0
  for (const r of regs || []) {
    const i = intMap.get(r.id)
    if (!i) { failed++; continue }
    try {
      await sendInteractiveNotificationEmail({
        registration_id: r.id,
        email: r.email,
        chinese_name: r.chinese_name,
        random_code: r.random_code,
        group_status: i.group_status,
        small_status: i.small_status,
        assigned_session: i.assigned_session,
        assigned_group: i.assigned_group,
        assigned_date: i.assigned_date,
      })
      await supabaseAdmin
        .from('interactive_registrations')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('registration_id', r.id)
      ok++
    } catch (e) {
      console.error('[interactive notify]', r.email, e)
      failed++
    }
  }

  return NextResponse.json({ message: `寄送完成：成功 ${ok} 封，失敗 ${failed} 封`, ok, failed })
}
