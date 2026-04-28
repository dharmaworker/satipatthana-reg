import { supabaseAdmin } from './supabase'

// 後台預覽用的測試學員（idempotent；不應出現在匯出／報表中）
// 預設 email 是 invalid 不發信用，admin 可以改成自己的 email 收測試信
export const PREVIEW_DEFAULT_EMAIL = 'preview@test.invalid'
export const PREVIEW_CODE = 'PREVIEW0'
export const PREVIEW_NAME = '[預覽] 測試學員'

const SITE_CONFIG_KEY = 'preview_test_student'

type StoredConfig = { id?: string }

async function readConfig(): Promise<StoredConfig> {
  const { data } = await supabaseAdmin
    .from('site_config')
    .select('value')
    .eq('key', SITE_CONFIG_KEY)
    .maybeSingle()
  return (data?.value as StoredConfig) || {}
}

async function writeConfig(cfg: StoredConfig): Promise<void> {
  await supabaseAdmin
    .from('site_config')
    .upsert({ key: SITE_CONFIG_KEY, value: cfg, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

// 取出測試學員的 registration row（含 id+email）；若不存在回傳 null。
// 先從 site_config 讀 id；若 site_config 沒寫過，fallback 用預設 email lookup（兼容舊資料）。
export async function getPreviewRegistration(): Promise<{ id: string; email: string } | null> {
  const cfg = await readConfig()
  if (cfg.id) {
    const { data } = await supabaseAdmin
      .from('registrations')
      .select('id, email')
      .eq('id', cfg.id)
      .maybeSingle()
    if (data) return data
    // site_config 指到的 row 已不存在 → 清掉
    await writeConfig({})
  }
  const { data: legacy } = await supabaseAdmin
    .from('registrations')
    .select('id, email')
    .eq('email', PREVIEW_DEFAULT_EMAIL)
    .maybeSingle()
  if (legacy) {
    await writeConfig({ id: legacy.id })
    return legacy
  }
  return null
}

export async function getPreviewRegistrationId(): Promise<string | null> {
  const r = await getPreviewRegistration()
  return r?.id ?? null
}

export async function setPreviewRegistrationId(id: string | null): Promise<void> {
  await writeConfig(id ? { id } : {})
}
