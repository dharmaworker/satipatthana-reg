// 互動報名／作業 共用 constants 與 types
// 寫死在這裡，未來若要 admin 編輯再做

export type SessionId = 's1' | 's2' | 's3'
export type TeacherId = 'prasan' | 'nat' | 'nitiya' | 'napatpol'
export type StatusValue = 'pending' | 'won' | 'lost'

export const TEACHERS: { id: TeacherId; name: string; nameEn: string; seats: number }[] = [
  { id: 'prasan',   name: '阿姜巴山', nameEn: 'Ajahn Prasan',   seats: 38 },
  { id: 'nat',      name: '阿姜納',   nameEn: 'Ajahn Nat',      seats: 38 },
  { id: 'nitiya',   name: '阿姜妮',   nameEn: 'Ajahn Nitiya',   seats: 38 },
  { id: 'napatpol', name: '阿姜松',   nameEn: 'Ajahn Napatpol', seats: 38 },
]
export const TEACHER_LABEL: Record<string, string> =
  Object.fromEntries(TEACHERS.map(t => [t.id, t.name]))

// 集體互動場次（teacher 欄位儲存顯示名稱，非 TeacherId）
export const SESSIONS: { id: SessionId; date: string; time: string; teacher: string; seats: number }[] = [
  { id: 's1', date: '8/20（四）', time: '14:30 — 15:30', teacher: '阿姜宋猜尊者', seats: 5 },
  { id: 's2', date: '8/21（五）', time: '14:00 — 15:30', teacher: '麥琪奧蘭努',   seats: 8 },
  { id: 's3', date: '8/24（一）', time: '14:00 — 15:30', teacher: '阿姜給尊者',   seats: 5 },
]
export const SESSION_LABEL: Record<string, string> = Object.fromEntries(
  SESSIONS.map(s => [s.id, `${s.date} ${s.time}　${s.teacher}`])
)

// 截止日期（互動報名）
export const INTERACTIVE_DEADLINE_MS = Date.UTC(2026, 6, 15, 12, 0, 0) // 2026/07/15 20:00 (Taipei) = 12:00 UTC

export const STATUS_LABEL: Record<StatusValue, string> = {
  pending: '未定',
  won: '中簽',
  lost: '沒中簽',
}

export type InteractiveRegistration = {
  registration_id: string
  wanted_sessions: SessionId[]
  wanted_ranking: TeacherId[]
  group_status: StatusValue
  small_status: StatusValue
  assigned_session: SessionId | null
  assigned_group: TeacherId | null
  assigned_date: string | null
  group_serial: number | null   // -1 ~ 70
  small_serial: number | null   // -1 ~ 70
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
