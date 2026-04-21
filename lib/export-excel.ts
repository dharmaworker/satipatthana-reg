import ExcelJS from 'exceljs'
import { supabaseAdmin } from './supabase'

const STATUS_LABEL: Record<string, string> = { pending: '審核中', approved: '已錄取', rejected: '未錄取' }
const PAYMENT_LABEL: Record<string, string> = { unpaid: '未繳費', paid: '待確認', verified: '已確認' }
const PLAN_LABEL: Record<string, string> = {
  A1: 'A(1) 8/20-8/24 食宿（匯款）',
  A2: 'A(2) 8/20-8/24 食宿（刷卡）',
  B1: 'B(1) 8/19-8/24 食宿（匯款）',
  B2: 'B(2) 8/19-8/24 食宿（刷卡）',
  C1: 'C(1) 8/19+8/25 食宿（匯款）',
  C2: 'C(2) 8/19+8/25 食宿（刷卡）',
  D1: 'D(1) 8/20-8/25 食宿（匯款）',
  D2: 'D(2) 8/20-8/25 食宿（刷卡）',
  T1: '【測試】匯款 1 元',
  T2: '【測試】刷卡 30 元',
}

const COLUMNS = [
  { key: 'created_at', header: '報名時間', width: 20 },
  { key: 'member_id', header: '序號', width: 12 },
  { key: 'student_id', header: '學號', width: 12 },
  { key: 'random_code', header: '繳費碼', width: 10 },
  { key: 'status', header: '審核狀態', width: 10 },
  { key: 'payment_status', header: '繳費狀態', width: 10 },
  { key: 'payment_plan', header: '繳費方案', width: 28 },
  { key: 'chinese_name', header: '中文姓名', width: 12 },
  { key: 'passport_name', header: '護照英文姓名', width: 22 },
  { key: 'identity', header: '身份', width: 8 },
  { key: 'dharma_name', header: '法名', width: 10 },
  { key: 'gender', header: '性別', width: 6 },
  { key: 'age', header: '年齡', width: 6 },
  { key: 'residence', header: '居住地', width: 12 },
  { key: 'phone', header: '手機', width: 15 },
  { key: 'email', header: 'Email', width: 24 },
  { key: 'line_id', header: 'LINE ID', width: 14 },
  { key: 'wechat_id', header: 'WeChat ID', width: 14 },
  { key: 'line_qr_url', header: 'LINE QR', width: 40 },
  { key: 'wechat_qr_url', header: 'WeChat QR', width: 40 },
  { key: 'practice_years', header: '修習年資', width: 12 },
  { key: 'practice_frequency', header: '練習頻率', width: 14 },
  { key: 'mental_health_note', header: '心理健康備註', width: 20 },
  { key: 'payment_note', header: '繳費備註', width: 24 },
  { key: 'payment_confirmed_at', header: '繳費確認時間', width: 20 },
]

function transformRow(r: any) {
  return {
    ...r,
    created_at: r.created_at ? new Date(r.created_at).toLocaleString('zh-TW') : '',
    status: STATUS_LABEL[r.status] || r.status,
    payment_status: PAYMENT_LABEL[r.payment_status] || r.payment_status,
    payment_plan: r.payment_plan ? (PLAN_LABEL[r.payment_plan] || r.payment_plan) : '',
    identity: r.identity === 'lay' ? '在家人' : r.identity === 'monastic' ? '僧眾' : r.identity,
    gender: r.gender === 'male' ? '男' : r.gender === 'female' ? '女' : r.gender,
    payment_confirmed_at: r.payment_confirmed_at ? new Date(r.payment_confirmed_at).toLocaleString('zh-TW') : '',
  }
}

function addSheet(wb: ExcelJS.Workbook, name: string, rows: any[]) {
  const sheet = wb.addWorksheet(name)
  sheet.columns = COLUMNS
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2E9' } }
  rows.forEach(r => sheet.addRow(transformRow(r)))
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

const LODGING_COLUMNS = [
  { key: 'updated_at', header: '更新時間', width: 20 },
  { key: 'chinese_name', header: '中文姓名', width: 12 },
  { key: 'member_id', header: '序號', width: 12 },
  { key: 'student_id', header: '學號', width: 12 },
  { key: 'random_code', header: '繳費碼', width: 10 },
  { key: 'residence', header: '居住地', width: 12 },
  { key: 'payment_plan', header: '方案', width: 10 },
  { key: 'payment_method', header: '繳費方式', width: 10 },
  { key: 'payment_status', header: '繳費狀態', width: 10 },
  { key: 'payment_note', header: '繳費備註', width: 60 },
  { key: 'payment_confirmed_at', header: '繳費確認時間', width: 20 },
  { key: 'arrival_date', header: '入住日', width: 12 },
  { key: 'departure_date', header: '離開日', width: 12 },
  { key: 'arrival_transport', header: '前往方式', width: 18 },
  { key: 'departure_transport', header: '離開方式', width: 10 },
  { key: 'bus_destination', header: '專車目的地', width: 14 },
  { key: 'diet', header: '飲食', width: 8 },
  { key: 'noon_fasting', header: '過午不食', width: 10 },
  { key: 'snacks', header: '茶點', width: 14 },
  { key: 'dinner_0819', header: '8/19 晚餐', width: 8 },
  { key: 'dinner_0824', header: '8/24 晚餐', width: 8 },
  { key: 'snoring', header: '打鼾', width: 6 },
  { key: 'emergency_name', header: '緊急聯絡人', width: 12 },
  { key: 'emergency_relation', header: '關係', width: 8 },
  { key: 'emergency_phone', header: '聯絡電話', width: 14 },
  { key: 'flight_arrival_date', header: '抵台日期', width: 12 },
  { key: 'flight_arrival_time', header: '抵台時間', width: 10 },
  { key: 'flight_departure_date', header: '離台日期', width: 12 },
  { key: 'flight_departure_time', header: '離台時間', width: 10 },
  { key: 'contact_id', header: '通訊軟體 / ID', width: 26 },
  { key: 'contact_qr_url', header: '通訊 QR 連結', width: 40 },
  { key: 'photo_url', header: '個人照片', width: 40 },
  { key: 'id_front_url', header: '身分證正面', width: 40 },
  { key: 'id_back_url', header: '身分證反面', width: 40 },
  { key: 'passport_url', header: '護照', width: 40 },
  { key: 'arc_url', header: 'ARC/居留證', width: 40 },
  { key: 'arrival_ticket_url', header: '來台機票', width: 40 },
  { key: 'departure_ticket_url', header: '離台機票', width: 40 },
  { key: 'test_0817_url', header: '8/17 快篩', width: 40 },
  { key: 'test_0819_url', header: '8/19 快篩', width: 40 },
]

function transformLodgingRow(l: any) {
  const reg = l.registration || {}
  const transportZh: Record<string, string> = {
    self: '8/19 自行',
    taipei_bus: '台北專車',
    wuri_bus: '烏日專車',
    airport_bus_0819: '桃園機場專車',
    self_0820: '8/20 自行',
    bus: '專車',
  }
  const paymentStatusZh: Record<string, string> = {
    unpaid: '未繳費', paid: '待確認', verified: '已確認',
  }
  return {
    ...l,
    updated_at: l.updated_at ? new Date(l.updated_at).toLocaleString('zh-TW') : '',
    chinese_name: reg.chinese_name || '',
    member_id: reg.member_id || '',
    student_id: reg.student_id || '',
    random_code: reg.random_code || '',
    residence: reg.residence || '',
    payment_plan: reg.payment_plan || '',
    payment_method: l.payment_method === 'transfer' ? '匯款' : '刷卡',
    payment_status: paymentStatusZh[reg.payment_status] || reg.payment_status || '',
    payment_note: reg.payment_note || '',
    payment_confirmed_at: reg.payment_confirmed_at ? new Date(reg.payment_confirmed_at).toLocaleString('zh-TW') : '',
    contact_id: reg.line_id
      ? `LINE: ${reg.line_id}`
      : reg.wechat_id
      ? `WeChat: ${reg.wechat_id}`
      : '',
    contact_qr_url: reg.line_qr_url || reg.wechat_qr_url || '',
    arrival_transport: transportZh[l.arrival_transport] || l.arrival_transport,
    departure_transport: transportZh[l.departure_transport] || l.departure_transport,
    diet: l.diet === 'meat' ? '葷' : '素',
    noon_fasting: l.noon_fasting === 'before_noon' ? '12前吃' : '12後吃',
    snacks: l.snacks === 'snacks_and_drink' ? '茶點+咖啡/茶' : '只咖啡/茶',
    dinner_0819: l.dinner_0819 ? '是' : '否',
    dinner_0824: l.dinner_0824 ? '是' : '否',
    snoring: l.snoring ? '會' : '否',
  }
}

function addLodgingSheet(wb: ExcelJS.Workbook, name: string, rows: any[]) {
  const sheet = wb.addWorksheet(name)
  sheet.columns = LODGING_COLUMNS
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2E9' } }
  rows.forEach(r => sheet.addRow(transformLodgingRow(r)))
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

export async function generateExportWorkbook(cutoff?: Date): Promise<{
  buffer: Buffer
  filename: string
  counts: Record<string, number>
}> {
  let query = supabaseAdmin.from('registrations').select('*').order('created_at', { ascending: true })
  if (cutoff) query = query.lte('created_at', cutoff.toISOString())
  const { data, error } = await query
  if (error) throw new Error(`DB query failed: ${error.message}`)
  const all = data || []

  // Lodging 另外撈
  let lodgingQuery = supabaseAdmin
    .from('lodging_registrations')
    .select('*, registration:registrations (chinese_name, member_id, random_code, residence, payment_plan, payment_status, payment_note, payment_confirmed_at, line_id, wechat_id, line_qr_url, wechat_qr_url)')
    .order('updated_at', { ascending: true })
  if (cutoff) lodgingQuery = lodgingQuery.lte('updated_at', cutoff.toISOString())
  const { data: lodgingData } = await lodgingQuery

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  wb.creator = 'satipatthana-reg'

  addSheet(wb, '全部', all)
  addSheet(wb, '待審核', all.filter(r => r.status === 'pending'))
  addSheet(wb, '已錄取未繳費', all.filter(r => r.status === 'approved' && r.payment_status !== 'verified'))
  addSheet(wb, '已繳費', all.filter(r => r.payment_status === 'verified'))
  addSheet(wb, '未錄取', all.filter(r => r.status === 'rejected'))
  addLodgingSheet(wb, '食宿登記', lodgingData || [])

  const buffer = Buffer.from(await wb.xlsx.writeBuffer())
  const dateStr = (cutoff || new Date()).toISOString().slice(0, 10)
  const filename = `registrations_${dateStr}.xlsx`

  return {
    buffer,
    filename,
    counts: {
      total: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      approved_unpaid: all.filter(r => r.status === 'approved' && r.payment_status !== 'verified').length,
      verified: all.filter(r => r.payment_status === 'verified').length,
      rejected: all.filter(r => r.status === 'rejected').length,
      lodgings: (lodgingData || []).length,
    },
  }
}
