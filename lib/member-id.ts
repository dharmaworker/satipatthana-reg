import { supabaseAdmin } from './supabase'

// 學員編號（序號）規則：T-001 / T-002 / ... 以 3 位數零填補
const MEMBER_ID_REGEX = /^T-(\d+)$/

export function isValidMemberId(v: string | null | undefined): boolean {
  return !!v && MEMBER_ID_REGEX.test(v)
}

export function formatMemberId(n: number): string {
  return `T-${String(n).padStart(3, '0')}`
}

// 計算下一個可用編號：掃全部 registrations，取現有最大 T-N + 1
export async function nextAvailableMemberId(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('member_id')
    .not('member_id', 'is', null)

  let maxN = 0
  for (const r of data || []) {
    const m = (r.member_id || '').match(MEMBER_ID_REGEX)
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
  }
  return formatMemberId(maxN + 1)
}
