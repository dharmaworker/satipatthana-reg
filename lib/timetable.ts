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
  days: TimetableDay[]
}

const KEY = 'course_timetable'

// 預設範本（取自 webpage/portal-schedule.html，已對齊本專案 8/20-24 課期）
export const DEFAULT_TIMETABLE: Timetable = {
  published: false,
  days: [
    {
      tabLabel: 'Day 1',
      tabDate: '08/20 開課',
      title: '第一日 · 開課',
      date: '2026 年 8 月 20 日（四）',
      desc: '報到、開營儀式、第一堂法談',
      rows: [
        { time: '07:00 之前', title: '報到・安單', desc: '抵達禪修場地，分配房間並領取課程資料。手機等 3C 裝置統一保管。', badge: 'gold' },
        { time: '09:00 — 10:00', title: '開營儀式', desc: '主辦單位致詞、助教老師介紹、課程規範說明。' },
        { time: '10:30 — 12:00', title: '禪坐', desc: '第一堂禪坐。' },
        { time: '12:00 — 13:30', title: '午齋', desc: '共修午齋（過午不食）。' },
        { time: '14:00 — 17:00', title: '法談・禪坐', desc: '法談開示與禪坐練習。' },
        { time: '19:00 — 21:00', title: '晚課・禪坐', desc: '晚課共修與夜間禪坐。' },
        { time: '21:30', title: '止靜就寢', desc: '保持禁語，回房休息。' },
      ],
    },
    {
      tabLabel: 'Day 2—4',
      tabDate: '典型日程',
      title: '第二至四日 · 典型日程',
      date: '2026/08/21 — 08/23',
      desc: '主要修行階段，禪坐、行禪、法談、互動交替進行',
      rows: [
        { time: '05:00 — 06:00', title: '起板・晨坐', desc: '早課禪坐，以正念開始新的一日。' },
        { time: '06:30 — 07:30', title: '早齋・行禪', desc: '用餐保持正念，餐後行禪。' },
        { time: '08:00 — 11:00', title: '禪坐・分組互動', desc: '交替禪坐與經行，按報名意願進行分組互動。', badge: 'gold' },
        { time: '11:30 — 12:30', title: '午齋', desc: '共修午齋，當日最後一餐（過午不食）。' },
        { time: '13:30 — 16:30', title: '法談・禪坐', desc: '助教老師法談開示，之後禪坐練習。' },
        { time: '17:00 — 18:30', title: '問答・集體互動', desc: '集體法義問答與集體互動時段。' },
        { time: '19:00 — 21:00', title: '晚課・禪坐', desc: '晚課共修與夜間禪坐。' },
        { time: '21:30', title: '止靜就寢', desc: '禁語就寢。' },
      ],
    },
    {
      tabLabel: 'Day 5',
      tabDate: '08/24 圓滿',
      title: '第五日 · 圓滿日',
      date: '2026 年 8 月 24 日（一）',
      desc: '總結、回向、閉營',
      rows: [
        { time: '05:00 — 07:30', title: '晨坐・早齋', desc: '最後一日晨間禪坐與早齋。' },
        { time: '08:00 — 10:30', title: '總結法談', desc: '助教老師總結五日修行要點，叮嚀日後用功方向。', badge: 'gold' },
        { time: '11:00 — 12:00', title: '回向・閉營', desc: '共修回向，圓滿閉營儀式。' },
        { time: '12:30 — 13:30', title: '午齋', desc: '共修午齋後準備離營。' },
        { time: '14:00', title: '圓滿解散', desc: '賦歸，將禪修所學帶回生活中。' },
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
