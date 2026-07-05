import { supabaseAdmin } from './supabase'
import { nextAvailableMemberId, nextAvailableOnlineStudentId } from './member-id'
import { sendFormatConversionEmail } from './format-conversion-email'

export type ConvReg = {
  id: string
  email: string
  chinese_name: string
  member_id: string | null
  student_id: string | null
  retreat_format: string | null
}

// 線→實 需寫入的三題答案（實→線 不需要，傳 undefined）
export type ForcedAnswers = {
  pay_confirm: boolean
  health_confirm: boolean
  mental_health_note: string
}

// 執行課程形式轉換（實體 ↔ 線上）。共用於會員自助與後台。
// 規則：報名序號一律換前綴+自動生新號；學號「有才動、沒有不補」；status 不變；寄通知信；寫稽核。
export async function performFormatConversion(reg: ConvReg, answers?: ForcedAnswers) {
  const currentlyOnline = reg.retreat_format === 'online'
  const targetOnline = !currentlyOnline

  const update: Record<string, unknown> = {}

  // 線 → 實：寫入三題（pay_confirm / health_confirm 為 boolean 欄位）
  if (!targetOnline && answers) {
    update.pay_confirm = answers.pay_confirm
    update.health_confirm = answers.health_confirm
    update.mental_health_note = answers.mental_health_note
  }

  update.retreat_format = targetOnline ? 'online' : 'in_person'

  // 學號：有才動、沒有不補
  const oldStudentId: string | null = reg.student_id
  let newStudentId: string | null = oldStudentId
  if (oldStudentId) {
    newStudentId = targetOnline ? await nextAvailableOnlineStudentId() : null
  }
  update.student_id = newStudentId

  // 報名序號：換前綴 + 自動生新號，遇唯一約束撞號則重試
  const oldMemberId: string | null = reg.member_id
  let newMemberId = ''
  let saved = false
  for (let attempt = 0; attempt < 6; attempt++) {
    newMemberId = await nextAvailableMemberId(targetOnline)
    update.member_id = newMemberId
    const { error } = await supabaseAdmin.from('registrations').update(update).eq('id', reg.id)
    if (!error) { saved = true; break }
    if (error.code === '23505') continue
    console.error('[convert-format] update failed', error)
    throw new Error('UPDATE_FAILED')
  }
  if (!saved) throw new Error('BUSY')

  // 稽核記錄（best-effort）
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

  // 轉換通知信（best-effort）
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

  return {
    retreat_format: update.retreat_format as string,
    member_id: newMemberId,
    student_id: newStudentId,
    toOnline: targetOnline,
  }
}
