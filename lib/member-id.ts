import { supabaseAdmin } from './supabase'

// 序號（member_id）：T-001/T-002 ... 錄取時由系統自動編
const SERIAL_REGEX = /^T-(\d+)$/
// 學號（student_id）：R-001/R-002 ... 食宿管理頁由操作員手動編
const STUDENT_REGEX = /^R-(\d+)$/

export function isValidMemberId(v: string | null | undefined): boolean {
  return !!v && SERIAL_REGEX.test(v)
}
export function isValidStudentId(v: string | null | undefined): boolean {
  return !!v && STUDENT_REGEX.test(v)
}

export function formatMemberId(n: number): string {
  return `T-${String(n).padStart(3, '0')}`
}
export function formatStudentId(n: number): string {
  return `R-${String(n).padStart(3, '0')}`
}

export async function nextAvailableMemberId(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('member_id')
    .not('member_id', 'is', null)
  let maxN = 0
  for (const r of data || []) {
    const m = (r.member_id || '').match(SERIAL_REGEX)
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
  }
  return formatMemberId(maxN + 1)
}

export async function nextAvailableStudentId(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('student_id')
    .not('student_id', 'is', null)
  let maxN = 0
  for (const r of data || []) {
    const m = (r.student_id || '').match(STUDENT_REGEX)
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
  }
  return formatStudentId(maxN + 1)
}
