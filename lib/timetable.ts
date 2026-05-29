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
  publish_at?: string | null
  zoom_link?: string
  zoom_meeting_id?: string
  zoom_password?: string
  days: TimetableDay[]
}

export function isTimetablePublished(t: Timetable): boolean {
  if (t.published) return true
  if (t.publish_at == null) return false
  return Date.now() >= new Date(t.publish_at).getTime()
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

  // 同步 course_sessions（儲存時間表時自動連動打卡場次）
  await syncCourseSessions(t)
}

async function syncCourseSessions(t: Timetable): Promise<void> {
  const sessionList: {
    sync_key: string
    day_number: number
    session_date: string
    time_label: string
    title: string
    sort_order: number
  }[] = []

  for (let di = 0; di < t.days.length; di++) {
    const day = t.days[di]
    const dayNumber = di + 1

    // 解析 ISO 日期，例："2026 年 8 月 20 日（星期四）" → "2026-08-20"
    const dateMatch = day.date.match(/(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日/)
    const sessionDate = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      : ''

    for (let ri = 0; ri < day.rows.length; ri++) {
      const row = day.rows[ri]
      if (!row.title && !row.time) continue
      sessionList.push({
        sync_key: `day${dayNumber}_row${ri + 1}`,
        day_number: dayNumber,
        session_date: sessionDate,
        time_label: row.time,
        title: row.title,
        sort_order: di * 100 + ri + 1,
      })
    }
  }

  if (sessionList.length === 0) return

  const currentSyncKeySet = new Set(sessionList.map(s => s.sync_key))

  // 1. 取得所有現有場次
  const { data: allExisting } = await supabaseAdmin
    .from('course_sessions')
    .select('id, sync_key, requires_checkin')

  // 2. 對每個 sync_key 只保留第一筆；其餘（重複、null、已移除）都視為 stale
  const existingMap = new Map<string, { id: string; requires_checkin: boolean }>()
  const staleIds: string[] = []

  for (const s of allExisting || []) {
    if (!s.sync_key || !currentSyncKeySet.has(s.sync_key)) {
      staleIds.push(s.id)  // null sync_key 或已從時間表移除
    } else if (!existingMap.has(s.sync_key)) {
      existingMap.set(s.sync_key, { id: s.id, requires_checkin: s.requires_checkin })
    } else {
      staleIds.push(s.id)  // 同 sync_key 的重複場次
    }
  }

  // 3. 刪除 stale 場次（跳過有打卡記錄者）
  if (staleIds.length > 0) {
    const { data: checkins } = await supabaseAdmin
      .from('course_session_checkins')
      .select('session_id')
      .in('session_id', staleIds)
    const sessionsWithCheckins = new Set((checkins || []).map((c: any) => c.session_id))
    const safeToDelete = staleIds.filter(id => !sessionsWithCheckins.has(id))
    if (safeToDelete.length > 0) {
      await supabaseAdmin.from('course_sessions').delete().in('id', safeToDelete)
    }
  }

  // 4. 更新現有場次 / 新增尚未存在的場次
  const toUpdate: any[] = []
  const toInsert: any[] = []

  for (const s of sessionList) {
    const found = existingMap.get(s.sync_key)
    if (found) {
      toUpdate.push({ id: found.id, ...s, requires_checkin: found.requires_checkin })
    } else {
      toInsert.push({ ...s, requires_checkin: false })
    }
  }

  if (toUpdate.length > 0) {
    await supabaseAdmin.from('course_sessions').upsert(toUpdate, { onConflict: 'id' })
  }
  if (toInsert.length > 0) {
    await supabaseAdmin.from('course_sessions').insert(toInsert)
  }
}
