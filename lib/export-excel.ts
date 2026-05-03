import ExcelJS from 'exceljs'
import { supabaseAdmin } from './supabase'
import { getPreviewRegistrationId } from './preview-test-student'

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
  { key: 'member_id', header: '報名序號', width: 12 },
  { key: 'student_id', header: '學號', width: 12 },
  { key: 'random_code', header: '專屬碼', width: 10 },
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
  { key: 'member_id', header: '報名序號', width: 12 },
  { key: 'student_id', header: '學號', width: 12 },
  { key: 'random_code', header: '專屬碼', width: 10 },
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

// ========== 互動報名 ==========
const INTERACTIVE_COLUMNS = [
  { key: 'updated_at', header: '更新時間', width: 20 },
  { key: 'chinese_name', header: '中文姓名', width: 12 },
  { key: 'member_id', header: '報名序號', width: 12 },
  { key: 'student_id', header: '學號', width: 12 },
  { key: 'random_code', header: '專屬碼', width: 10 },
  { key: 'wanted_sessions_str', header: '想要的集體場次', width: 30 },
  { key: 'wanted_ranking_str', header: '想要的分組排序', width: 30 },
  { key: 'group_status_zh', header: '集體狀態', width: 10 },
  { key: 'assigned_session_label', header: '指定集體場次', width: 26 },
  { key: 'group_serial', header: '集體序號', width: 10 },
  { key: 'small_status_zh', header: '分組狀態', width: 10 },
  { key: 'assigned_group_label', header: '指定分組', width: 12 },
  { key: 'assigned_date', header: '指定日期', width: 12 },
  { key: 'small_serial', header: '分組序號', width: 10 },
  { key: 'notification_sent_at', header: '通知信寄出時間', width: 20 },
  { key: 'submitted_at', header: '學員送出時間', width: 20 },
]

const SESSION_LABEL_EXPORT: Record<string, string> = {
  s1: '8/20（四）宋猜尊者',
  s2: '8/21（五）奧蘭努',
  s3: '8/24（一）阿姜給',
}
const TEACHER_LABEL_EXPORT: Record<string, string> = {
  prasan: '阿姜巴山', nat: '阿姜納', nitiya: '阿姜妮', napatpol: '阿姜松',
}
const STATUS_ZH: Record<string, string> = { pending: '未定', won: '中簽', lost: '沒中簽' }

function transformInteractiveRow(i: any) {
  const reg = i.registration || {}
  const wantedSessions = Array.isArray(i.wanted_sessions) ? i.wanted_sessions : []
  const wantedRanking = Array.isArray(i.wanted_ranking) ? i.wanted_ranking : []
  return {
    updated_at: i.updated_at ? new Date(i.updated_at).toLocaleString('zh-TW') : '',
    chinese_name: reg.chinese_name || '',
    member_id: reg.member_id || '',
    student_id: reg.student_id || '',
    random_code: reg.random_code || '',
    wanted_sessions_str: wantedSessions.map((s: string) => SESSION_LABEL_EXPORT[s] || s).join('、') || '（不報名）',
    wanted_ranking_str: wantedRanking.length === 0
      ? '（不報名）'
      : wantedRanking.map((t: string, idx: number) => `${idx + 1}.${TEACHER_LABEL_EXPORT[t] || t}`).join(' '),
    group_status_zh: STATUS_ZH[i.group_status] || i.group_status || '',
    assigned_session_label: i.assigned_session ? SESSION_LABEL_EXPORT[i.assigned_session] || i.assigned_session : '',
    group_serial: i.group_serial ?? '',
    small_status_zh: STATUS_ZH[i.small_status] || i.small_status || '',
    assigned_group_label: i.assigned_group ? `${TEACHER_LABEL_EXPORT[i.assigned_group] || i.assigned_group} 組` : '',
    assigned_date: i.assigned_date || '',
    small_serial: i.small_serial ?? '',
    notification_sent_at: i.notification_sent_at ? new Date(i.notification_sent_at).toLocaleString('zh-TW') : '',
    submitted_at: i.submitted_at ? new Date(i.submitted_at).toLocaleString('zh-TW') : '',
  }
}

function addInteractiveSheet(wb: ExcelJS.Workbook, name: string, rows: any[]) {
  const sheet = wb.addWorksheet(name)
  sheet.columns = INTERACTIVE_COLUMNS
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2E9' } }
  rows.forEach(r => sheet.addRow(transformInteractiveRow(r)))
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

// ========== 課前共修打卡 ==========
function addPracticeSheet(
  wb: ExcelJS.Workbook,
  name: string,
  approvedRegs: any[],
  scheduleItems: { id: string; sort_order: number; session_date: string; time_label: string; title: string; is_live: boolean }[],
  checkinsByRegId: Map<string, Set<string>>,
) {
  const sheet = wb.addWorksheet(name)
  const cols: { key: string; header: string; width: number }[] = [
    { key: 'member_id', header: '報名序號', width: 12 },
    { key: 'student_id', header: '學號', width: 12 },
    { key: 'chinese_name', header: '中文姓名', width: 12 },
    ...scheduleItems.map(item => {
      const d = new Date(item.session_date)
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
      const titleShort = item.is_live ? '直播' : item.title.replace(/《|》/g, '').slice(0, 6)
      return { key: `item_${item.id}`, header: `${dateStr} ${titleShort}`, width: 10 }
    }),
    { key: 'checked_count', header: '打卡數', width: 8 },
    { key: 'total', header: '總項目', width: 8 },
  ]
  sheet.columns = cols
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2E9' } }

  for (const reg of approvedRegs) {
    const checked = checkinsByRegId.get(reg.id) || new Set<string>()
    const row: Record<string, any> = {
      member_id: reg.member_id || '',
      student_id: reg.student_id || '',
      chinese_name: reg.chinese_name || '',
      checked_count: checked.size,
      total: scheduleItems.length,
    }
    for (const item of scheduleItems) {
      row[`item_${item.id}`] = checked.has(item.id) ? '✓' : ''
    }
    sheet.addRow(row)
  }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

// ========== 互動作業 ==========
const INTERACTIVE_TASK_COLUMNS = [
  { key: 'updated_at', header: '更新時間', width: 20 },
  { key: 'chinese_name', header: '中文姓名', width: 12 },
  { key: 'member_id', header: '報名序號', width: 12 },
  { key: 'student_id', header: '學號', width: 12 },
  { key: 'email', header: 'Email', width: 24 },
  { key: 'assigned_session_label', header: '中簽集體場次', width: 26 },
  { key: 'group_prior_interaction_zh', header: '集體：曾互動', width: 12 },
  { key: 'group_question', header: '集體：互動問題', width: 60 },
  { key: 'assigned_group_label', header: '中簽分組', width: 16 },
  { key: 'assigned_date', header: '中簽日期', width: 12 },
  { key: 'small_prior_interaction_zh', header: '分組：曾互動', width: 12 },
  { key: 'small_question', header: '分組：互動問題', width: 60 },
  { key: 'learning_duration', header: '修習年資', width: 16 },
  { key: 'formal_practice', header: '固定形式練習', width: 40 },
  { key: 'daily_practice', header: '日常練習', width: 40 },
  { key: 'submitted_at', header: '送出時間', width: 20 },
]

function transformInteractiveTaskRow(t: any) {
  const reg = t.registration || {}
  const it = t.interactive || {}
  return {
    updated_at: t.updated_at ? new Date(t.updated_at).toLocaleString('zh-TW') : '',
    chinese_name: reg.chinese_name || '',
    member_id: reg.member_id || '',
    student_id: reg.student_id || '',
    email: reg.email || '',
    assigned_session_label: it.assigned_session ? SESSION_LABEL_EXPORT[it.assigned_session] || it.assigned_session : '',
    group_prior_interaction_zh: t.group_prior_interaction === 'yes' ? '是' : t.group_prior_interaction === 'no' ? '否' : '',
    group_question: t.group_question || '',
    assigned_group_label: it.assigned_group ? `${TEACHER_LABEL_EXPORT[it.assigned_group] || it.assigned_group} 組` : '',
    assigned_date: it.assigned_date || '',
    small_prior_interaction_zh: t.small_prior_interaction === 'yes' ? '是' : t.small_prior_interaction === 'no' ? '否' : '',
    small_question: t.small_question || '',
    learning_duration: t.learning_duration || '',
    formal_practice: t.formal_practice || '',
    daily_practice: t.daily_practice || '',
    submitted_at: t.submitted_at ? new Date(t.submitted_at).toLocaleString('zh-TW') : '',
  }
}

function addInteractiveTaskSheet(wb: ExcelJS.Workbook, name: string, rows: any[]) {
  const sheet = wb.addWorksheet(name)
  sheet.columns = INTERACTIVE_TASK_COLUMNS
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2E9' } }
  rows.forEach(r => sheet.addRow(transformInteractiveTaskRow(r)))
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

export async function generateExportWorkbook(cutoff?: Date): Promise<{
  buffer: Buffer
  filename: string
  bufferOnline: Buffer
  filenameOnline: string
  counts: Record<string, number>
}> {
  // 排除後台預覽測試學員
  const previewId = await getPreviewRegistrationId()

  let query = supabaseAdmin.from('registrations').select('*').order('created_at', { ascending: true })
  if (previewId) query = query.neq('id', previewId)
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
  if (previewId) lodgingQuery = lodgingQuery.neq('registration_id', previewId)
  const { data: lodgingData } = await lodgingQuery

  // 互動報名 + 互動作業
  let interactiveQuery = supabaseAdmin
    .from('interactive_registrations')
    .select('*, registration:registrations (chinese_name, member_id, student_id, random_code)')
    .order('updated_at', { ascending: true })
  if (cutoff) interactiveQuery = interactiveQuery.lte('updated_at', cutoff.toISOString())
  if (previewId) interactiveQuery = interactiveQuery.neq('registration_id', previewId)
  const { data: interactiveData } = await interactiveQuery

  let taskQuery = supabaseAdmin
    .from('interactive_tasks')
    .select('*, registration:registrations (chinese_name, member_id, student_id, email)')
    .order('updated_at', { ascending: true })
  if (cutoff) taskQuery = taskQuery.lte('updated_at', cutoff.toISOString())
  if (previewId) taskQuery = taskQuery.neq('registration_id', previewId)
  const { data: taskData } = await taskQuery

  // Task 需要 assigned_* 從 interactive_registrations 帶入；建 map
  const intMap = new Map((interactiveData || []).map((i: any) => [i.registration_id, i]))
  const tasksWithInteractive = (taskData || []).map((t: any) => ({
    ...t,
    interactive: intMap.get(t.registration_id) || null,
  }))

  // 課前共修
  const { data: practiceItems } = await supabaseAdmin
    .from('practice_schedule')
    .select('id, sort_order, session_date, time_label, title, is_live')
    .eq('enabled', true)
    .order('sort_order')

  const approvedIds = all.filter(r => r.status === 'approved').map(r => r.id)
  const { data: practiceCheckins } = approvedIds.length > 0
    ? await supabaseAdmin
        .from('practice_checkins')
        .select('registration_id, schedule_item_id')
        .in('registration_id', approvedIds)
    : { data: [] as { registration_id: string; schedule_item_id: string }[] }

  const checkinsByRegId = new Map<string, Set<string>>()
  for (const c of practiceCheckins || []) {
    if (!checkinsByRegId.has(c.registration_id)) checkinsByRegId.set(c.registration_id, new Set())
    checkinsByRegId.get(c.registration_id)!.add(c.schedule_item_id)
  }
  const practiceSchedule = practiceItems || []

  // 實體／線上分開
  const inPerson = all.filter(r => r.retreat_format !== 'online')
  const online = all.filter(r => r.retreat_format === 'online')

  // ─── 實體 workbook ───
  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  wb.creator = 'satipatthana-reg'

  addSheet(wb, '全部', inPerson)
  addSheet(wb, '待審核', inPerson.filter(r => r.status === 'pending'))
  addSheet(wb, '已錄取未繳費', inPerson.filter(r => r.status === 'approved' && r.payment_status !== 'verified'))
  addSheet(wb, '已繳費', inPerson.filter(r => r.payment_status === 'verified'))
  addSheet(wb, '未錄取', inPerson.filter(r => r.status === 'rejected'))
  addLodgingSheet(wb, '食宿登記', lodgingData || [])
  addInteractiveSheet(wb, '互動報名', interactiveData || [])
  addInteractiveTaskSheet(wb, '互動作業', tasksWithInteractive)
  addPracticeSheet(wb, '課前共修打卡', inPerson.filter(r => r.status === 'approved'), practiceSchedule, checkinsByRegId)

  const buffer = Buffer.from(await wb.xlsx.writeBuffer())
  const dateStr = (cutoff || new Date()).toISOString().slice(0, 10)
  const filename = `registrations_inperson_${dateStr}.xlsx`

  // ─── 線上 workbook ───
  const wbOnline = new ExcelJS.Workbook()
  wbOnline.created = new Date()
  wbOnline.creator = 'satipatthana-reg'

  addSheet(wbOnline, '全部（線上）', online)
  addSheet(wbOnline, '待審核', online.filter(r => r.status === 'pending'))
  addSheet(wbOnline, '已錄取', online.filter(r => r.status === 'approved'))
  addSheet(wbOnline, '未錄取', online.filter(r => r.status === 'rejected'))
  addPracticeSheet(wbOnline, '課前共修打卡', online.filter(r => r.status === 'approved'), practiceSchedule, checkinsByRegId)

  const bufferOnline = Buffer.from(await wbOnline.xlsx.writeBuffer())
  const filenameOnline = `registrations_online_${dateStr}.xlsx`

  return {
    buffer,
    filename,
    bufferOnline,
    filenameOnline,
    counts: {
      total: all.length,
      in_person: inPerson.length,
      online: online.length,
      pending: inPerson.filter(r => r.status === 'pending').length,
      approved_unpaid: inPerson.filter(r => r.status === 'approved' && r.payment_status !== 'verified').length,
      verified: inPerson.filter(r => r.payment_status === 'verified').length,
      rejected: inPerson.filter(r => r.status === 'rejected').length,
      lodgings: (lodgingData || []).length,
      interactive_registrations: (interactiveData || []).length,
      interactive_tasks: (taskData || []).length,
      online_pending: online.filter(r => r.status === 'pending').length,
      online_approved: online.filter(r => r.status === 'approved').length,
      online_rejected: online.filter(r => r.status === 'rejected').length,
    },
  }
}
