import { supabaseAdmin } from './supabase'

// 互動報名開放狀態與截止時間（admin 控制）
const KEY = 'interactive_config'

// INTERACTIVE_DEADLINE_MS 作為 fallback，當 DB 中尚未設定 deadline_ms 時使用
import { INTERACTIVE_DEADLINE_MS } from './interactive'

export type InteractiveConfig = {
  open: boolean
  deadline_ms?: number       // 互動報名截止（UTC epoch ms）
  task_open_ms?: number      // 互動作業開放（UTC epoch ms）
  task_deadline_ms?: number  // 互動作業截止（UTC epoch ms）
}
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

export function resolveDeadlineMs(config: InteractiveConfig): number {
  return config.deadline_ms ?? INTERACTIVE_DEADLINE_MS
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
