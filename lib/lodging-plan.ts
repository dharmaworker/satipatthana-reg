// 從食宿登記答案推導 payment_plan（A1~D2）

const LETTER: Record<string, string> = {
  '2026-08-20|2026-08-24': 'A', // 標準
  '2026-08-19|2026-08-24': 'B', // 提前一晚
  '2026-08-19|2026-08-25': 'C', // 前後各加一晚
  '2026-08-20|2026-08-25': 'D', // 延後一晚
}

export function derivePaymentPlan(
  arrival: string,
  departure: string,
  method: 'transfer' | 'credit_card'
): string | null {
  const letter = LETTER[`${arrival}|${departure}`]
  if (!letter) return null
  const digit = method === 'transfer' ? '1' : '2'
  return letter + digit
}

export const PLAN_AMOUNTS: Record<string, number> = {
  A1: 18600, A2: 19300,
  B1: 20350, B2: 21050,
  C1: 22590, C2: 23290,
  D1: 20840, D2: 21540,
  T1: 1, T2: 30,
}
