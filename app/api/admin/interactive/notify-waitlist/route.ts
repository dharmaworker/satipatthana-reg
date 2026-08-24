import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchRowsByIds } from '@/lib/supabase'
import { sendInteractiveNotificationEmail } from '@/lib/interactive-notify-email'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value || null
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  if (ids.length === 0) return NextResponse.json({ error: '未選擇對象' }, { status: 400 })

  const ints = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
    .from('interactive_registrations')
    .select('*')
    .in('registration_id', chunk))
  const intMap = new Map(ints.map(i => [i.registration_id, i]))

  // 依 id 分批查詢：uuid 全塞進查詢字串會超過長度上限，單次查詢也只回 1000 筆
  const regs = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, random_code')
    .in('id', chunk))

  let ok = 0, failed = 0, skipped = 0
  for (const r of regs) {
    const i = intMap.get(r.id)
    if (!i) { failed++; continue }
    // 已中簽 → 跳過（應用中簽信按鈕）
    if (i.group_status === 'won' || i.small_status === 'won') { skipped++; continue }
    // 至少一邊候補才寄
    if (i.group_status !== 'waitlist' && i.small_status !== 'waitlist') { skipped++; continue }
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
        group_serial: i.group_serial,
        small_serial: i.small_serial,
      })
      ok++
    } catch (e) {
      console.error('[interactive notify-waitlist]', r.email, e)
      failed++
    }
  }

  const parts = [`成功 ${ok} 封`]
  if (failed > 0) parts.push(`失敗 ${failed} 封`)
  if (skipped > 0) parts.push(`跳過 ${skipped} 筆（已中簽或非候補）`)
  return NextResponse.json({ message: `寄送完成：${parts.join('，')}`, ok, failed, skipped })
}
