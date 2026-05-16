// 互動報名／作業 共用 types 與靜態常數
// 場次、老師、名額等動態設定已移至 interactive_sessions / interactive_small_slots DB 表

export type StatusValue = 'pending' | 'won' | 'waitlist' | 'lost' | 'abstain'

// 截止日期（互動報名）
export const INTERACTIVE_DEADLINE_MS = Date.UTC(2026, 6, 15, 12, 0, 0) // 2026/07/15 20:00 (Taipei)

export const STATUS_LABEL: Record<StatusValue, string> = {
  pending: '未定',
  won: '中簽',
  waitlist: '候補',
  lost: '沒中簽',
  abstain: '棄權',
}

export type InteractiveRegistration = {
  registration_id: string
  wanted_sessions: string[]
  wanted_ranking: string[]
  group_status: StatusValue
  small_status: StatusValue
  assigned_session: string | null
  assigned_group: string | null
  assigned_date: string | null
  group_serial: number | null
  small_serial: number | null
  notification_sent_at: string | null
  submitted_at: string
  updated_at: string
}

export const SERIAL_OPTIONS: number[] = (() => {
  const arr: number[] = []
  for (let i = -1; i <= 70; i++) arr.push(i)
  return arr
})()

export type InteractiveTask = {
  registration_id: string
  learning_duration: string | null
  formal_practice: string | null
  daily_practice: string | null
  group_prior_interaction: string | null
  group_question: string | null
  small_prior_interaction: string | null
  small_question: string | null
  submitted_at: string
  updated_at: string
}
