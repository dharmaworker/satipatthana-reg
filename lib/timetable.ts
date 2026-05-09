import { supabaseAdmin } from './supabase'

export type TimetableRow = {
  time: string
  title: string
  desc: string
  badge?: 'gold' | ''
}
export type TimetableDay = {
  tabLabel: string
  tabDate: string
  title: string
  date: string
  desc: string
  rows: TimetableRow[]
}
export type Timetable = {
  published: boolean
  zoom_link?: string
  zoom_meeting_id?: string
  zoom_password?: string
  days: TimetableDay[]
}

const KEY = 'course_timetable'

export const DEFAULT_TIMETABLE: Timetable = {
  published: false,
  days: [
    {
      tabLabel: 'Day 1',
      tabDate: '08/20 開課',
      title: '第一日 · 開課',
      date: '2026 年 8 月 20 日（星期四）',
      desc: '報到、法談並檢查作業、分組法談',
      rows: [
        { time: '08:00 — 10:00', title: '報到、辦理入住', desc: '' },
        { time: '10:00 — 11:30', title: '法談並檢查作業', desc: '老師A 開示（n 人）・全體學員在大會議室旁聽', badge: 'gold' },
        { time: '11:30 — 14:30', title: '午餐、自由分組修行', desc: '' },
        { time: '14:30 — 15:30', title: '法談並檢查作業', desc: '老師B（n 人）・泰國線上，泰國時間 13:30 – 14:30', badge: 'gold' },
        { time: '15:30 — 16:30', title: '休息', desc: '' },
        { time: '16:30 — 18:00', title: '分組法談', desc: '老師C／老師D／老師E（n×n）・老師A 組：休息／進行合適的修行／檢查剩餘學員作業', badge: 'gold' },
        { time: '18:00 — 19:00', title: '晚餐、發展覺性', desc: '' },
        { time: '19:00 — 19:15', title: '晚課', desc: '' },
        { time: '19:30 — 20:30', title: '觀看隆波帕默尊者開示視頻', desc: '' },
        { time: '20:30', title: '發展覺性、修固定形式', desc: '' },
      ],
    },
    {
      tabLabel: 'Day 2',
      tabDate: '08/21',
      title: '第二日',
      date: '2026 年 8 月 21 日（星期五）',
      desc: '早課、行腳、法談並檢查作業、分組法談',
      rows: [
        { time: '06:30 — 06:45', title: '早課', desc: '' },
        { time: '07:00 — 08:00', title: '行腳', desc: '' },
        { time: '08:00 — 09:00', title: '早餐、發展覺性', desc: '' },
        { time: '09:00 — 10:00', title: '自由修行', desc: '' },
        { time: '10:00 — 11:30', title: '法談並檢查作業', desc: '老師E 開示（n 人）・全體學員在大會議室旁聽', badge: 'gold' },
        { time: '11:30 — 14:00', title: '午餐、自由修行', desc: '' },
        { time: '14:00 — 15:30', title: '法談並檢查作業', desc: '麥琪奧蘭努（n 人）・泰國線上，泰國時間 13:00 – 14:30', badge: 'gold' },
        { time: '15:30 — 16:30', title: '休息', desc: '' },
        { time: '16:30 — 18:00', title: '分組法談', desc: '老師A／老師C／老師D（n×n）・老師E 組：休息／進行合適的修行／檢查剩餘學員作業', badge: 'gold' },
        { time: '18:00 — 19:00', title: '晚餐、發展覺性', desc: '' },
        { time: '19:00 — 19:15', title: '晚課', desc: '' },
        { time: '19:30 — 20:30', title: '觀看隆波帕默尊者開示視頻', desc: '' },
        { time: '20:30', title: '發展覺性、修固定形式', desc: '' },
      ],
    },
    {
      tabLabel: 'Day 3',
      tabDate: '08/22',
      title: '第三日',
      date: '2026 年 8 月 22 日（星期六）',
      desc: '早課、行腳、聆聽隆波帕默尊者開示、分組法談',
      rows: [
        { time: '06:30 — 06:45', title: '早課', desc: '' },
        { time: '07:00 — 08:00', title: '行腳', desc: '' },
        { time: '08:00 — 09:00', title: '早餐、發展覺性', desc: '' },
        { time: '09:00 — 09:45', title: '個人自由活動', desc: '' },
        { time: '09:45', title: '集合於會議室', desc: '' },
        { time: '10:00 — 11:00', title: '聆聽隆波帕默尊者佛法開示', desc: '泰國時間 09:00 – 10:00', badge: 'gold' },
        { time: '11:30 — 14:00', title: '午餐、自由修行', desc: '' },
        { time: '14:00 — 15:30', title: '法談並檢查作業', desc: '老師D 開示（n 人）・全體學員在大會議室旁聽', badge: 'gold' },
        { time: '15:30 — 16:30', title: '休息', desc: '' },
        { time: '16:30 — 18:00', title: '分組法談', desc: '老師C／老師A／老師E（n×n）・老師D 組：休息／進行合適的修行／檢查剩餘學員作業', badge: 'gold' },
        { time: '18:00 — 19:00', title: '晚餐、發展覺性', desc: '' },
        { time: '19:00 — 19:15', title: '晚課', desc: '' },
        { time: '19:30 — 20:30', title: '自由修行', desc: '' },
        { time: '20:30', title: '發展覺性、修固定形式', desc: '' },
      ],
    },
    {
      tabLabel: 'Day 4',
      tabDate: '08/23',
      title: '第四日',
      date: '2026 年 8 月 23 日（星期日）',
      desc: '早課、行腳、聆聽隆波帕默尊者開示、分組法談',
      rows: [
        { time: '06:30 — 06:45', title: '早課', desc: '' },
        { time: '07:00 — 08:00', title: '行腳', desc: '' },
        { time: '08:00 — 09:00', title: '早餐、發展覺性', desc: '' },
        { time: '09:00 — 09:45', title: '個人自由活動', desc: '' },
        { time: '09:45', title: '集合於會議室', desc: '' },
        { time: '10:00 — 11:00', title: '聆聽隆波帕默尊者佛法開示', desc: '泰國時間 09:00 – 10:00', badge: 'gold' },
        { time: '11:30 — 14:00', title: '午餐、自由修行', desc: '' },
        { time: '14:00 — 15:30', title: '法談並檢查作業', desc: '老師C 開示（n 人）・全體學員在大會議室旁聽', badge: 'gold' },
        { time: '15:30 — 16:30', title: '休息', desc: '' },
        { time: '16:30 — 18:00', title: '分組法談', desc: '老師D／老師A／老師E（n×n）・老師C 組：休息／進行合適的修行／檢查剩餘學員作業', badge: 'gold' },
        { time: '18:00 — 19:00', title: '晚餐、發展覺性', desc: '' },
        { time: '19:00 — 19:15', title: '晚課', desc: '' },
        { time: '19:30 — 20:30', title: '自由修行', desc: '' },
        { time: '20:30', title: '發展覺性、修固定形式', desc: '' },
      ],
    },
    {
      tabLabel: 'Day 5',
      tabDate: '08/24 圓滿',
      title: '第五日 · 圓滿日',
      date: '2026 年 8 月 24 日（星期一）',
      desc: '早課、分組法談、閉幕',
      rows: [
        { time: '06:30 — 06:45', title: '早課', desc: '' },
        { time: '07:00 — 08:00', title: '觀看隆波帕默尊者開示視頻', desc: '' },
        { time: '08:00 — 09:00', title: '早餐、發展覺性', desc: '' },
        { time: '09:00 — 10:00', title: '個人自由活動', desc: '' },
        { time: '10:00 — 11:30', title: '分組法談', desc: '老師C／老師A／老師D／老師E（n×n）', badge: 'gold' },
        { time: '11:30 — 14:00', title: '午餐、自由修行／自由休息', desc: '' },
        { time: '14:00 — 15:30', title: '法談並檢查作業', desc: '老師F（n 人）・泰國線上，泰國時間 13:00 – 14:30', badge: 'gold' },
        { time: '15:30 — 16:30', title: '休息', desc: '' },
        { time: '16:30', title: '主辦方閉幕致辭並合影留念', desc: '' },
      ],
    },
  ],
}

export async function fetchTimetable(): Promise<Timetable> {
  const { data, error } = await supabaseAdmin
    .from('site_config')
    .select('value')
    .eq('key', KEY)
    .maybeSingle()

  if (error || !data) return DEFAULT_TIMETABLE
  return { ...DEFAULT_TIMETABLE, ...(data.value as Partial<Timetable>) }
}

export async function saveTimetable(t: Timetable): Promise<void> {
  const { error } = await supabaseAdmin
    .from('site_config')
    .upsert(
      { key: KEY, value: t, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  if (error) throw error
}
