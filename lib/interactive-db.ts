import { supabaseAdmin } from './supabase'

export type DbSession = {
  id: string           // 's1', 's2', ...  對應 interactive_registrations.wanted_sessions 的值
  teacher: string      // 顯示名稱
  date: string         // 顯示格式，如 '8/20（四）'
  time: string
  cap: number
  waitlist_cap: number
  is_active: boolean
  sort_order: number
}

export type DbSmallSlot = {
  id: string           // uuid
  teacher_key: string  // 'prasan'...  對應 interactive_registrations.wanted_ranking / assigned_group
  teacher_label: string
  date: string         // ISO 日期，如 '2026-08-21'
  cap: number
  waitlist_cap: number
  is_active: boolean
  sort_order: number
}

export type DbTeacher = {
  key: string
  label: string
  total_cap: number   // 所有 active slot 的 cap 加總
  slots: DbSmallSlot[]
}

export async function fetchActiveSessions(): Promise<DbSession[]> {
  const { data } = await supabaseAdmin
    .from('interactive_sessions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data || []) as DbSession[]
}

export async function fetchAllSessions(): Promise<DbSession[]> {
  const { data } = await supabaseAdmin
    .from('interactive_sessions')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data || []) as DbSession[]
}

export async function fetchActiveSmallSlots(): Promise<DbSmallSlot[]> {
  const { data } = await supabaseAdmin
    .from('interactive_small_slots')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data || []) as DbSmallSlot[]
}

export async function fetchAllSmallSlots(): Promise<DbSmallSlot[]> {
  const { data } = await supabaseAdmin
    .from('interactive_small_slots')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data || []) as DbSmallSlot[]
}

// 從 slots 推導出 teacher 列表（保留順序，依 sort_order 排序後第一次出現為準）
export function deriveTeachersFromSlots(slots: DbSmallSlot[]): DbTeacher[] {
  const map = new Map<string, DbTeacher>()
  for (const slot of slots) {
    if (!map.has(slot.teacher_key)) {
      map.set(slot.teacher_key, { key: slot.teacher_key, label: slot.teacher_label, total_cap: 0, slots: [] })
    }
    const t = map.get(slot.teacher_key)!
    t.total_cap += slot.cap
    t.slots.push(slot)
  }
  return Array.from(map.values())
}

// 快速查表：session id → label（date + time + teacher）
export function buildSessionLabelMap(sessions: DbSession[]): Record<string, string> {
  return Object.fromEntries(sessions.map(s => [s.id, `${s.date} ${s.time}　${s.teacher}`]))
}

// 快速查表：teacher_key → label
export function buildTeacherLabelMap(teachers: DbTeacher[]): Record<string, string> {
  return Object.fromEntries(teachers.map(t => [t.key, t.label]))
}
