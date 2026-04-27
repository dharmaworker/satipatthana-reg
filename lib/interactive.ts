// 互動報名／作業 共用 constants 與 types
// 寫死在這裡，未來若要 admin 編輯再做

export type SessionId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6'
export type TeacherId = 'prasan' | 'nat' | 'nitiya' | 'napatpol'
export type StatusValue = 'pending' | 'won' | 'lost'

export const TEACHERS: { id: TeacherId; name: string; nameEn: string }[] = [
  { id: 'prasan',   name: '阿姜巴山', nameEn: 'Ajahn Prasan' },
  { id: 'nat',      name: '阿姜納',   nameEn: 'Ajahn Nat' },
  { id: 'nitiya',   name: '阿姜妮',   nameEn: 'Ajahn Nitiya' },
  { id: 'napatpol', name: '阿姜松',   nameEn: 'Ajahn Napatpol' },
]
export const TEACHER_LABEL: Record<string, string> =
  Object.fromEntries(TEACHERS.map(t => [t.id, t.name]))

// 集體互動場次（webpage 寫死的 6 場）
export const SESSIONS: { id: SessionId; date: string; weekday: string; time: string; teacher: TeacherId; seats: number }[] = [
  { id: 's1', date: '8/21', weekday: '週五', time: '14:00 — 15:30', teacher: 'prasan',   seats: 8 },
  { id: 's2', date: '8/21', weekday: '週五', time: '14:00 — 15:30', teacher: 'nat',      seats: 8 },
  { id: 's3', date: '8/22', weekday: '週六', time: '14:00 — 15:30', teacher: 'nitiya',   seats: 8 },
  { id: 's4', date: '8/22', weekday: '週六', time: '14:00 — 15:30', teacher: 'napatpol', seats: 8 },
  { id: 's5', date: '8/23', weekday: '週日', time: '14:00 — 15:30', teacher: 'prasan',   seats: 8 },
  { id: 's6', date: '8/23', weekday: '週日', time: '14:00 — 15:30', teacher: 'nitiya',   seats: 8 },
]
export const SESSION_LABEL: Record<string, string> = Object.fromEntries(
  SESSIONS.map(s => [s.id, `${s.date}（${s.weekday}）${s.time}　${TEACHER_LABEL[s.teacher]}`])
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
  group_serial: number | null   // -1 ~ 15
  small_serial: number | null   // -1 ~ 15
  notification_sent_at: string | null
  submitted_at: string
  updated_at: string
}

export const SERIAL_OPTIONS: number[] = (() => {
  const arr: number[] = []
  for (let i = -1; i <= 15; i++) arr.push(i)
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
