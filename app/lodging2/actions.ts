'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getLodgingDeadlineMs, ScheduleConfig } from '@/lib/registration-period'
import { sendMailWithRetry } from '@/lib/mailer'
import { randomUUID } from 'crypto'
import { FILE_FIELDS, CHECKIN_TO_ISO } from './constants'
import { planToLodgingDefaults } from '@/lib/lodging-plan'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getFileExt(file: File): string {
  let ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ext || ext.length > 4) {
    ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'bin')
  }
  return ext
}

async function uploadFile(file: File, kind: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error('檔案過大，請壓縮至 5MB 以下')
  if (!ALLOWED_MIME.includes(file.type)) throw new Error('僅接受 JPG / PNG / WEBP / PDF')

  const ext = getFileExt(file)
  const filename = `${kind}/${randomUUID()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await supabaseAdmin.storage
    .from('lodging-docs')
    .upload(filename, arrayBuffer, { contentType: file.type, upsert: false })
  if (uploadErr) throw new Error(`上傳失敗：${uploadErr.message}`)

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('lodging-docs')
    .getPublicUrl(filename)
  return publicUrl
}

function getTextVal(formData: FormData, key: string): string {
  const v = formData.get(key)
  return v instanceof File ? '' : (v as string || '')
}

// ─── validation ───────────────────────────────────────────────────────────────

function validateStep1(d: Record<string, string>): string | null {
  if (!d.checkin_date) return '請選擇「入住日期」'
  if (!d.emergency_name) return '請填寫「緊急聯絡人姓名」'
  if (!d.emergency_relation) return '請填寫「緊急聯絡人關係」'
  if (!d.emergency_phone) return '請填寫「緊急聯絡人電話」'
  if (!d.arrival_transport) return '請選擇「前往日月潭方式」'
  if (!d.departure_transport) return '請選擇「離開日月潭湖畔會館方式」'
  if (d.departure_transport === 'bus' && !d.bus_destination) return '請選擇「專車目的地」'
  return null
}

function validateStep2(d: Record<string, string>): string | null {
  if (!d.diet) return '請選擇「飲食」'
  if (!d.noon_fasting) return '請選擇「過午不食」'
  if (!d.dinner_need) return '請選擇「是否需要安排晚餐」'
  if (!d.snacks) return '請選擇「茶點需求」'
  return null
}

function validateStep3(d: Record<string, string>): string | null {
  if (!d.identity_type) return '請選擇「申請人身份」'
  return null
}

function validateStep4(d: Record<string, string>): string | null {
  if (!d.photo_url) return '請上傳「個人相片」'
  const itype = d.identity_type || 'id'
  if (itype === 'id') {
    if (!d.id_front_url) return '請上傳「身分證正面」'
    if (!d.id_back_url) return '請上傳「身分證反面」'
  } else if (itype === 'passport') {
    if (!d.passport_url) return '請上傳「護照」'
    if (!d.flight_arrival_date) return '請填寫「抵台航班日期」'
    if (!d.flight_arrival_time) return '請填寫「抵台航班時間」'
    if (!d.flight_departure_date) return '請填寫「離台航班日期」'
    if (!d.flight_departure_time) return '請填寫「離台航班時間」'
  } else if (itype === 'arc') {
    if (!d.arc_url) return '請上傳「ARC／居留證」'
  }
  return null
}

function validateStep5(d: Record<string, string>): string | null {
  if (!d.agree_covid_rules) return '請勾選「同意防疫與課程規範」'
  return null
}

function validateStep(step: number, d: Record<string, string>): string | null {
  if (step === 1) return validateStep1(d)
  if (step === 2) return validateStep2(d)
  if (step === 3) return validateStep3(d)
  if (step === 4) return validateStep4(d)
  if (step === 5) return validateStep5(d)
  return null
}

/** Full validation before final DB save */
function validateAll(d: Record<string, string>): string | null {
  return validateStep1(d) || validateStep2(d) || validateStep3(d) || validateStep4(d) || validateStep5(d)
}

// ─── DB save ──────────────────────────────────────────────────────────────────

async function saveToDB(draft: Record<string, string>, id: string, code: string): Promise<string | null> {
  // Verify registration
  const { data: reg, error: regErr } = await supabaseAdmin
    .from('registrations')
    .select('id, random_code, chinese_name, email, member_id, status, payment_plan, registration_phase')
    .eq('id', id)
    .eq('random_code', code.toUpperCase())
    .single()
  if (regErr || !reg) return '找不到報名資料'
  if (reg.status !== 'approved') return '尚未錄取，無法填寫食宿登記'

  // Deadline check
  const { data: scData } = await supabaseAdmin.from('site_config').select('value').eq('key', 'schedule_config').maybeSingle()
  const schedCfg = (scData?.value ?? {}) as ScheduleConfig
  const phase = (reg.registration_phase === 'late' ? 'late' : 'open') as 'open' | 'late'
  const deadlineMs = getLodgingDeadlineMs(schedCfg, phase)
  if (Date.now() > deadlineMs) return '食宿登記已截止，無法再送出'

  // Edit limit check (first submit + one edit = 2 total)
  const { data: existing } = await supabaseAdmin
    .from('lodging_registrations')
    .select('id, created_at, updated_at')
    .eq('registration_id', reg.id)
    .maybeSingle()
  if (existing && existing.updated_at !== existing.created_at) {
    return '您已修改過一次，無法再次修改。如有錯誤請聯絡學會。'
  }

  // Derive dinner fields
  const dinnerYes = draft.dinner_need === 'yes'

  // Derive identity type (default from residence or stored field)
  const itype = draft.identity_type || (existing ? '' : 'id')

  const planDefaults = reg.payment_plan ? planToLodgingDefaults(reg.payment_plan) : null

  const payload = {
    registration_id: reg.id,
    arrival_date: CHECKIN_TO_ISO[draft.checkin_date] || draft.checkin_date || (planDefaults?.arrival_date ?? null),
    departure_date: planDefaults?.departure_date ?? null,
    payment_method: planDefaults?.payment_method ?? null,
    emergency_name: draft.emergency_name,
    emergency_relation: draft.emergency_relation,
    emergency_phone: draft.emergency_phone,
    arrival_transport: draft.arrival_transport,
    departure_transport: draft.departure_transport,
    bus_destination: draft.bus_destination || null,
    diet: draft.diet,
    noon_fasting: draft.noon_fasting,
    snacks: draft.snacks,
    dinner_0819: dinnerYes,
    dinner_0824: dinnerYes,
    snoring: draft.snoring === 'true',
    agree_covid_rules: draft.agree_covid_rules === 'true',
    id_front_url: draft.id_front_url || null,
    id_back_url: draft.id_back_url || null,
    passport_url: draft.passport_url || null,
    arc_url: draft.arc_url || null,
    photo_url: draft.photo_url || null,
    arrival_ticket_url: draft.arrival_ticket_url || null,
    departure_ticket_url: draft.departure_ticket_url || null,
    test_0817_url: draft.test_0817_url || null,
    test_0819_url: draft.test_0819_url || null,
    flight_arrival_date: draft.flight_arrival_date || null,
    flight_arrival_time: draft.flight_arrival_time || null,
    flight_departure_date: draft.flight_departure_date || null,
    flight_departure_time: draft.flight_departure_time || null,
  }

  let lodging: any
  if (!existing) {
    const res = await supabaseAdmin.from('lodging_registrations').insert(payload).select().single()
    if (res.error) return `儲存失敗（DB）：${res.error.message}`
    lodging = res.data
  } else {
    const res = await supabaseAdmin
      .from('lodging_registrations')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (res.error) return `儲存失敗（DB）：${res.error.message}`
    lodging = res.data
  }

  // Send confirmation email (best-effort)
  try {
    const arrivalZh = ({
      self: '自行抵達',
      taipei_bus: '搭主辦專車（8/19 上午 8:30 台北車站）',
      wuri_bus: '搭主辦專車（8/19 上午 9:30 烏日高鐵）',
      airport_bus_0819: '搭主辦專車（8/19 下午 02:30～03:00 桃園機場第一航廈）',
      self_0820: '8/20 上午 8:00 前自行抵達日月潭湖畔會館',
    } as Record<string, string>)[draft.arrival_transport] || draft.arrival_transport
    const departureZh = draft.departure_transport === 'self' ? '自行離開' : '乘坐主辦單位專車'
    const busDestZh = {
      taipei_824_pm: '8/24 下午 6:00–6:30 到台北車站',
      taipei_825_am: '8/25 上午 9:00 到台北車站',
      wuri_825_am: '8/25 上午 9:00 到烏日高鐵',
      taoyuan_824_pm: '8/24 下午 5:30–6:00 到台中高鐵站',
      taoyuan_825_am: '8/25 上午 9:00 到桃園機場第一航廈',
    }[draft.bus_destination] || ''
    const dietZh = draft.diet === 'meat' ? '葷食' : '素食'
    const noonZh = draft.noon_fasting === 'before_noon' ? '需於中午12點前用餐' : '否，不是過午不食'

    // Dynamically import to avoid circular dependency confusion — inline HTML is fine
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
    const qt1Label = draft.qt1_day || ''
    const qt2Label = draft.qt2_day || ''

    await sendMailWithRetry({
      to: reg.email,
      bcc: archiveEmail,
      subject: '【第二屆台灣四念處禪修】食宿登記確認',
      html: `
        <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; color: #222;">
          <h2 style="color:#2d6a4f;">食宿登記確認 🙏</h2>
          <p>${reg.chinese_name} 法友您好，</p>
          <p>您已完成食宿登記。以下為登記摘要：</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;width:140px;">報名序號</td><td style="padding:6px 10px;border:1px solid #eee;">${reg.member_id || '待編號'}</td></tr>
            <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">方案</td><td style="padding:6px 10px;border:1px solid #eee;">${reg.payment_plan || '（尚未選擇）'}</td></tr>
            <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">前往方式</td><td style="padding:6px 10px;border:1px solid #eee;">${arrivalZh}</td></tr>
            <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">離開方式</td><td style="padding:6px 10px;border:1px solid #eee;">${departureZh}${busDestZh ? '：' + busDestZh : ''}</td></tr>
            <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">飲食</td><td style="padding:6px 10px;border:1px solid #eee;">${dietZh}　${noonZh}</td></tr>
            <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">茶點</td><td style="padding:6px 10px;border:1px solid #eee;">${draft.snacks === 'snacks_and_drink' ? '需要茶點 + 咖啡/茶' : '只需咖啡/茶'}</td></tr>
            <tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;">緊急聯絡人</td><td style="padding:6px 10px;border:1px solid #eee;">${draft.emergency_name}（${draft.emergency_relation}）${draft.emergency_phone}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#666;font-size:13px;margin-top:16px;">台灣四念處學會 🙏</p>
        </div>
      `,
    }, { mailType: 'lodging_confirm' })
  } catch {
    // non-fatal
  }

  return null
}

// ─── main server action ───────────────────────────────────────────────────────

export async function handleStep(formData: FormData) {
  const cs = await cookies()
  const action = formData.get('action') as string
  const step = parseInt(getTextVal(formData, 'step')) || 1
  const id = getTextVal(formData, 'id')
  const code = getTextVal(formData, 'code')

  if (!id || !code) redirect('/lodging2?error=' + encodeURIComponent('缺少必要參數'))

  // Merge existing draft with current form submission
  const existingStr = cs.get('lodging2_draft')?.value || '{}'
  const existing: Record<string, string> = JSON.parse(existingStr)
  const draft: Record<string, string> = { ...existing }

  // Collect text fields from form (hidden + visible)
  for (const [key, val] of formData.entries()) {
    if (key === 'action') continue
    if (val instanceof File) continue
    draft[key] = val as string
  }

  // Derive dinner_* from dinner_need
  if (draft.dinner_need === 'yes') { draft.dinner_0819 = 'true'; draft.dinner_0824 = 'true' }
  else if (draft.dinner_need === 'no') { draft.dinner_0819 = ''; draft.dinner_0824 = '' }

  // Back button — save and redirect
  if (action === 'prev') {
    cs.set('lodging2_draft', JSON.stringify(draft), { maxAge: 3600, httpOnly: true, sameSite: 'lax', path: '/lodging2' })
    redirect(`/lodging2?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&step=${step - 1}`)
  }

  // Upload files from step 4
  if (step === 4) {
    const uploadErrors: string[] = []
    for (const [key, val] of formData.entries()) {
      if (val instanceof File && val.size > 0) {
        const urlKey = FILE_FIELDS[key]
        if (urlKey) {
          try {
            draft[urlKey] = await uploadFile(val, key.replace('_file', ''))
          } catch (e: any) {
            uploadErrors.push(e.message || '上傳失敗')
          }
        }
      }
    }
    if (uploadErrors.length > 0) {
      cs.set('lodging2_draft', JSON.stringify(draft), { maxAge: 3600, httpOnly: true, sameSite: 'lax', path: '/lodging2' })
      return redirect(`/lodging2?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&step=4&error=${encodeURIComponent(uploadErrors[0])}`)
    }
  }

  // Validate current step
  const err = validateStep(step, draft)
  if (err) {
    cs.set('lodging2_draft', JSON.stringify(draft), { maxAge: 3600, httpOnly: true, sameSite: 'lax', path: '/lodging2' })
    return redirect(`/lodging2?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&step=${step}&error=${encodeURIComponent(err)}`)
  }

  // Save draft to cookie
  cs.set('lodging2_draft', JSON.stringify(draft), { maxAge: 3600, httpOnly: true, sameSite: 'lax', path: '/lodging2' })

  const nextStep = step + 1
  if (nextStep > 5) {
    // Final submit — full validate + DB save
    const fullErr = validateAll(draft)
    if (fullErr) {
      return redirect(`/lodging2?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&step=4&error=${encodeURIComponent(fullErr)}`)
    }
    const dbErr = await saveToDB(draft, id, code)
    if (dbErr) {
      return redirect(`/lodging2?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&step=4&error=${encodeURIComponent(dbErr)}`)
    }
    cs.delete('lodging2_draft')
    return redirect(`/lodging2/success?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}`)
  }

  return redirect(`/lodging2?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&step=${nextStep}`)
}

/** Re-upload a single file (for step 3 inline, without advancing step). */
export async function uploadSingleFile(formData: FormData) {
  try {
    const file = formData.get('file')
    const kind = formData.get('kind') as string
    if (!(file instanceof File) || !file.size) throw new Error('缺少檔案')
    const url = await uploadFile(file, kind)
    return { url }
  } catch (e: any) {
    return { error: e.message || '上傳失敗' }
  }
}
