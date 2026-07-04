import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { nextAvailableMemberId, nextAvailableOnlineStudentId } from '@/lib/member-id'
import { sendFormatConversionEmail } from '@/lib/format-conversion-email'

// POST /api/member/convert-format?id=...&code=...
// 會員自助切換課程形式：實體 ↔ 線上
// 規則：報名序號一律換前綴+自動生新號；學號「有才動、沒有不補」；status 不變。
// 線→實 需強制補填 Q16 繳費 / Q17 健康 / Q18 精神史。
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, member_id, student_id, retreat_format, status')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()

  if (!reg) return NextResponse.json({ error: '無效的存取連結' }, { status: 401 })

  const currentlyOnline = reg.retreat_format === 'online'
  const targetOnline = !currentlyOnline

  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const update: Record<string, unknown> = {}

  // 線 → 實：強制補填三題（與報名表單同規則）
  if (!targetOnline) {
    const pay = body.pay_confirm
    const health = body.health_confirm
    const mental = typeof body.mental_health_note === 'string' ? body.mental_health_note : ''
    if (pay !== 'yes') return NextResponse.json({ error: '請確認是否可於期限內完成繳費（Q16 須選「是」）' }, { status: 400 })
    if (health !== 'yes') return NextResponse.json({ error: '請確認身體健康能全程參與（Q17 須選「是」）' }, { status: 400 })
    if (mental !== 'no' && !mental.startsWith('yes:')) {
      return NextResponse.json({ error: '請回答是否有心理／精神疾病史（Q18）' }, { status: 400 })
    }
    // pay_confirm / health_confirm 於資料表為 boolean（見 register 頁 form 送出前的 === 'yes' 轉換）
    update.pay_confirm = pay === 'yes'
    update.health_confirm = health === 'yes'
    update.mental_health_note = mental
  }

  update.retreat_format = targetOnline ? 'online' : 'in_person'

  // 學號：有才動、沒有不補
  const oldStudentId: string | null = reg.student_id
  let newStudentId: string | null = oldStudentId
  if (oldStudentId) {
    // 實→線：配發線上學號 C-XXX；線→實：清空（實體學號 R 由學會手動編）
    newStudentId = targetOnline ? await nextAvailableOnlineStudentId() : null
  }
  update.student_id = newStudentId

  // 報名序號：換前綴 + 自動生新號，遇唯一約束撞號則重試（重讀 max+1）
  const oldMemberId: string | null = reg.member_id
  let newMemberId = ''
  let saved = false
  for (let attempt = 0; attempt < 6; attempt++) {
    newMemberId = await nextAvailableMemberId(targetOnline)
    update.member_id = newMemberId
    const { error } = await supabaseAdmin.from('registrations').update(update).eq('id', reg.id)
    if (!error) { saved = true; break }
    if (error.code === '23505') continue // 撞號（member_id / student_id 唯一索引）→ 重試
    console.error('[convert-format] update failed', error)
    return NextResponse.json({ error: '轉換失敗，請稍後再試' }, { status: 500 })
  }
  if (!saved) return NextResponse.json({ error: '系統忙碌，請稍後再試' }, { status: 503 })

  // 稽核記錄（best-effort：表未建立也不影響轉換）
  try {
    await supabaseAdmin.from('format_conversion_logs').insert({
      registration_id: reg.id,
      from_format: reg.retreat_format,
      to_format: update.retreat_format,
      old_member_id: oldMemberId,
      new_member_id: newMemberId,
      old_student_id: oldStudentId,
      new_student_id: newStudentId,
    })
  } catch (e) {
    console.error('[convert-format] audit log failed', e)
  }

  // 轉換通知信（best-effort：寄信失敗不影響轉換結果）
  try {
    await sendFormatConversionEmail({
      email: reg.email,
      chinese_name: reg.chinese_name,
      toOnline: targetOnline,
      newMemberId,
      newStudentId,
      hadStudentId: !!oldStudentId,
    })
  } catch (e) {
    console.error('[convert-format] email failed', e)
  }

  return NextResponse.json({
    ok: true,
    retreat_format: update.retreat_format,
    member_id: newMemberId,
    student_id: newStudentId,
  })
}
