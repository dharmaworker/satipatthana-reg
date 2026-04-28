import { supabaseAdmin } from './supabase'

// 互動報名是否開放（admin 控制）
const KEY = 'interactive_config'

export type InteractiveConfig = { open: boolean }
const DEFAULT: InteractiveConfig = { open: false }

export async function fetchInteractiveConfig(): Promise<InteractiveConfig> {
  const { data } = await supabaseAdmin
    .from('site_config')
    .select('value')
    .eq('key', KEY)
    .maybeSingle()
  if (!data) return DEFAULT
  return { ...DEFAULT, ...(data.value as Partial<InteractiveConfig>) }
}

export async function saveInteractiveConfig(c: InteractiveConfig): Promise<void> {
  const { error } = await supabaseAdmin
    .from('site_config')
    .upsert(
      { key: KEY, value: c, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  if (error) throw error
}
