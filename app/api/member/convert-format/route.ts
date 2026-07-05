import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { performFormatConversion, type ForcedAnswers } from '@/lib/convert-format'

// POST /api/member/convert-format?id=...&code=...
// 會員自助切換課程形式：實體 ↔ 線上
// 線→實 需強制補填 Q16 繳費 / Q17 健康 / Q18 精神史。
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, member_id, student_id, retreat_format')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()

  if (!reg) return NextResponse.json({ error: '無效的存取連結' }, { status: 401 })

  const targetOnline = reg.retreat_format !== 'online'
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  // 線 → 實：驗證並收集三題（與報名表單同規則，須為「是」）
  let answers: ForcedAnswers | undefined
  if (!targetOnline) {
    const pay = body.pay_confirm
    const health = body.health_confirm
    const mental = typeof body.mental_health_note === 'string' ? body.mental_health_note : ''
    if (pay !== 'yes') return NextResponse.json({ error: '請確認是否可於期限內完成繳費（Q16 須選「是」）' }, { status: 400 })
    if (health !== 'yes') return NextResponse.json({ error: '請確認身體健康能全程參與（Q17 須選「是」）' }, { status: 400 })
    if (mental !== 'no' && !mental.startsWith('yes:')) {
      return NextResponse.json({ error: '請回答是否有心理／精神疾病史（Q18）' }, { status: 400 })
    }
    answers = { pay_confirm: true, health_confirm: true, mental_health_note: mental }
  }

  try {
    const result = await performFormatConversion(reg, answers)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'BUSY') return NextResponse.json({ error: '系統忙碌，請稍後再試' }, { status: 503 })
    return NextResponse.json({ error: '轉換失敗，請稍後再試' }, { status: 500 })
  }
}
