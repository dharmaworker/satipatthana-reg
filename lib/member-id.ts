import { supabaseAdmin, fetchAllRows } from './supabase'

// 實體報名序號（member_id）：T-001 ... 報名時自動編
const SERIAL_REGEX = /^T-(\d+)$/
// 線上報名序號（member_id）：L-001 ... 報名時自動編
const ONLINE_SERIAL_REGEX = /^L-(\d+)$/
// 實體學號（student_id）：R-001 ... 手動編
const STUDENT_REGEX = /^R-(\d+)$/
// 線上學號（student_id）：C-001 ... 錄取時自動編
const ONLINE_STUDENT_REGEX = /^C-(\d+)$/

export function isValidMemberId(v: string | null | undefined): boolean {
  return !!v && (SERIAL_REGEX.test(v) || ONLINE_SERIAL_REGEX.test(v))
}
export function isValidStudentId(v: string | null | undefined): boolean {
  return !!v && (STUDENT_REGEX.test(v) || ONLINE_STUDENT_REGEX.test(v))
}

export function formatMemberId(n: number): string {
  return `T-${String(n).padStart(3, '0')}`
}
export function formatOnlineMemberId(n: number): string {
  return `L-${String(n).padStart(3, '0')}`
}
export function formatStudentId(n: number): string {
  return `R-${String(n).padStart(3, '0')}`
}
export function formatOnlineStudentId(n: number): string {
  return `C-${String(n).padStart(3, '0')}`
}

export async function nextAvailableMemberId(isOnline = false): Promise<string> {
  const regex = isOnline ? ONLINE_SERIAL_REGEX : SERIAL_REGEX
  const format = isOnline ? formatOnlineMemberId : formatMemberId
  // 必須分頁全撈：單次查詢上限 1000 筆，掃描被截斷會算出偏小的最大流水號 → 發出重複序號
  const data = await fetchAllRows<{ member_id: string | null }>(
    (from, to) => supabaseAdmin
      .from('registrations')
      .select('member_id')
      .not('member_id', 'is', null)
      .order('id', { ascending: true })
      .range(from, to),
  )
  let maxN = 0
  for (const r of data) {
    const m = (r.member_id || '').match(regex)
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
  }
  return format(maxN + 1)
}

export async function nextAvailableStudentId(): Promise<string> {
  // 同上：掃描被截斷會發出重複學號
  const data = await fetchAllRows<{ student_id: string | null }>(
    (from, to) => supabaseAdmin
      .from('registrations')
      .select('student_id')
      .not('student_id', 'is', null)
      .order('id', { ascending: true })
      .range(from, to),
  )
  let maxN = 0
  for (const r of data) {
    const m = (r.student_id || '').match(STUDENT_REGEX)
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
  }
  return formatStudentId(maxN + 1)
}

export async function nextAvailableOnlineStudentId(): Promise<string> {
  // 同上：掃描被截斷會發出重複學號
  const data = await fetchAllRows<{ student_id: string | null }>(
    (from, to) => supabaseAdmin
      .from('registrations')
      .select('student_id')
      .not('student_id', 'is', null)
      .order('id', { ascending: true })
      .range(from, to),
  )
  let maxN = 0
  for (const r of data) {
    const m = (r.student_id || '').match(ONLINE_STUDENT_REGEX)
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
  }
  return formatOnlineStudentId(maxN + 1)
}
