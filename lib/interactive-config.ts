import { supabaseAdmin } from './supabase'

// 互動報名開放狀態與截止時間（admin 控制）
const KEY = 'interactive_config'

// INTERACTIVE_DEADLINE_MS 作為 fallback，當 DB 中尚未設定 deadline_ms 時使用
import { INTERACTIVE_DEADLINE_MS } from './interactive'

export type InteractiveConfig = {
  open: boolean
  open_ms?: number           // 互動報名開始（UTC epoch ms）
  deadline_ms?: number       // 互動報名截止（UTC epoch ms）
  task_open_ms?: number      // 互動作業開放（UTC epoch ms）
  task_deadline_ms?: number  // 互動作業截止（UTC epoch ms）
}
const DEFAULT: InteractiveConfig = { open: false }

export function resolveOpenMs(config: InteractiveConfig): number | null {
  return config.open_ms ?? null
}

/** 依時間區間判斷互動報名是否開放（open_ms 到 deadline_ms 之間） */
export function isInteractiveOpen(config: InteractiveConfig, atMs: number = Date.now()): boolean {
  const openMs = resolveOpenMs(config)
  const deadlineMs = resolveDeadlineMs(config)
  if (openMs === null) return config.open  // 未設定時間則走舊邏輯
  return atMs >= openMs && atMs < deadlineMs
}

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
