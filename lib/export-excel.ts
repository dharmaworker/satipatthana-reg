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
  { key: 'member_id', header: '學號', width: 12 },
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

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  wb.creator = 'satipatthana-reg'

  addSheet(wb, '全部', all)
  addSheet(wb, '待審核', all.filter(r => r.status === 'pending'))
  addSheet(wb, '已錄取未繳費', all.filter(r => r.status === 'approved' && r.payment_status !== 'verified'))
  addSheet(wb, '已繳費', all.filter(r => r.payment_status === 'verified'))
  addSheet(wb, '未錄取', all.filter(r => r.status === 'rejected'))

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
    },
  }
}
