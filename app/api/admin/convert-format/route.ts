import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { performFormatConversion, type ForcedAnswers } from '@/lib/convert-format'

// POST /api/admin/convert-format  { id }
// 後台切換報名者課程形式：實體 ↔ 線上
// 規則與會員自助相同；差別：線→實 的三題由後台自動以「正面答案」寫入資料庫。
export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { id } = await request.json().catch(() => ({} as { id?: string }))
  if (!id) return NextResponse.json({ error: '缺少報名 id' }, { status: 400 })

  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, member_id, student_id, retreat_format, status')
    .eq('id', id)
    .single()

  if (!reg) return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })

  const targetOnline = reg.retreat_format !== 'online'

  // 線→實：後台自動填正面答案（同意繳費、身體健康、無精神疾病史）
  const answers: ForcedAnswers | undefined = targetOnline
    ? undefined
    : { pay_confirm: true, health_confirm: true, mental_health_note: 'no' }

  try {
    const result = await performFormatConversion(reg, answers)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'BUSY') return NextResponse.json({ error: '系統忙碌，請稍後再試' }, { status: 503 })
    return NextResponse.json({ error: '轉換失敗，請稍後再試' }, { status: 500 })
  }
}
