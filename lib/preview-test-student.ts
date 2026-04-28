import { supabaseAdmin } from './supabase'

// 後台預覽用的測試學員（idempotent；不應出現在匯出／報表中）
export const PREVIEW_EMAIL = 'preview@test.invalid'
export const PREVIEW_CODE = 'PREVIEW0'
export const PREVIEW_NAME = '[預覽] 測試學員'

// 取出測試學員的 registration_id（若不存在回傳 null）
export async function getPreviewRegistrationId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('id')
    .eq('email', PREVIEW_EMAIL)
    .maybeSingle()
  return data?.id ?? null
}
