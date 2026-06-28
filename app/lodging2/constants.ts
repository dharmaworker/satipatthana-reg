export const TRANSPORT_LABEL: Record<string, string> = {
  self: '8/19 自行抵達日月潭湖畔會館',
  taipei_bus: '主辦專車：8/19 上午 8:30 台北車站東 3 門集合',
  wuri_bus: '主辦專車：8/19 上午 9:30 烏日高鐵站 6 號出口',
  airport_bus_0819: '主辦專車：8/19 下午 02:30～03:00 桃園機場第一航廈',
  self_0820: '8/20 上午 8:00 前自行抵達日月潭湖畔會館',
}

export const BUS_DEST_LABEL: Record<string, string> = {
  taipei_824_pm: '8/24 下午 6:00–6:30 專車到台北車站',
  taipei_825_am: '8/25 上午 9:00 專車到台北車站',
  wuri_825_am: '8/25 上午 9:00 專車到烏日高鐵',
  taoyuan_824_pm:
    '8/24 下午 5:30–6:00 專車接送至台中高鐵站。搭乘8/24晚上飛機返程的學員，請自行由台中高鐵站搭乘高鐵前往桃園機場。',
  taoyuan_825_am: '8/25 上午 9:00 專車到桃園機場第一航廈',
}

export const PLAN_INFO: Record<string, { label: string; date: string; checkin: string; amount: number; method: string }> = {
  A1: { label: 'A 方案', date: '8/20 — 8/24', checkin: '8/20', amount: 18600, method: '匯款' },
  A2: { label: 'A 方案', date: '8/20 — 8/24', checkin: '8/20', amount: 19300, method: '刷卡' },
  B1: { label: 'B 方案', date: '8/19 — 8/24', checkin: '8/19', amount: 20350, method: '匯款' },
  B2: { label: 'B 方案', date: '8/19 — 8/24', checkin: '8/19', amount: 21050, method: '刷卡' },
  C1: { label: 'C 方案', date: '8/19 — 8/25', checkin: '8/19', amount: 22590, method: '匯款' },
  C2: { label: 'C 方案', date: '8/19 — 8/25', checkin: '8/19', amount: 23290, method: '刷卡' },
  D1: { label: 'D 方案', date: '8/20 — 8/25', checkin: '8/20', amount: 20840, method: '匯款' },
  D2: { label: 'D 方案', date: '8/20 — 8/25', checkin: '8/20', amount: 21540, method: '刷卡' },
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: '待繳費',
  paid: '已匯款（待確認）',
  verified: '✓ 已確認繳費',
}

export const FULL_DATE_TO_CHECKIN: Record<string, string> = {
  '2026-08-18': '8/18',
  '2026-08-19': '8/19',
  '2026-08-20': '8/20',
}

export const CHECKIN_TO_ISO: Record<string, string> = {
  '8/18': '2026-08-18',
  '8/19': '2026-08-19',
  '8/20': '2026-08-20',
}

export const DIET_LABEL: Record<string, string> = { meat: '葷食', vegetarian: '素食' }

export const NOON_LABEL: Record<string, string> = {
  before_noon: '是（中午12點前用餐）',
  fasting_no: '否',
}

export const DINNER_LABEL: Record<string, string> = { yes: '需要', no: '不需要' }

export const SNACKS_LABEL: Record<string, string> = {
  snacks_and_drink: '需要茶點、咖啡 OR 茶',
  drink_only: '只需要咖啡 OR 茶',
}

export const IDENTITY_LABEL: Record<string, string> = {
  id: '台灣人（身分證正反面）',
  passport: '外籍短期旅客（護照 + 航班）',
  arc: '在台外籍居民（ARC／居留證）',
}

export const STEPS = [
  { num: 1, label: '行程安排', en: 'Travel' },
  { num: 2, label: '離開方式', en: 'Departure' },
  { num: 3, label: '飲食偏好', en: 'Diet' },
  { num: 4, label: '身份類別', en: 'Identity' },
  { num: 5, label: '證件上傳', en: 'Documents' },
  { num: 6, label: '確認送出', en: 'Review' },
]

/** File input names → storage key prefix */
export const FILE_FIELDS: Record<string, string> = {
  photo_file: 'photo_url',
  id_front_file: 'id_front_url',
  id_back_file: 'id_back_url',
  passport_file: 'passport_url',
  arc_file: 'arc_url',
  arrival_ticket_file: 'arrival_ticket_url',
  departure_ticket_file: 'departure_ticket_url',
  test_0817_file: 'test_0817_url',
  test_0819_file: 'test_0819_url',
}
