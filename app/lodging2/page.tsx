import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_ASSETS } from '@/lib/site-assets'
import {
  getLodgingDeadlineMs, getQuicktestDeadline1Ms, getQuicktestDeadline2Ms,
  msToDotLabel, msToDayLabel, msToTimeLabel, ScheduleConfig,
} from '@/lib/registration-period'
import { planToLodgingDefaults } from '@/lib/lodging-plan'
import { handleStep } from './actions'
import {
  TRANSPORT_LABEL, BUS_DEST_LABEL, PLAN_INFO, PAYMENT_STATUS_LABEL,
  FULL_DATE_TO_CHECKIN, DIET_LABEL, NOON_LABEL, DINNER_LABEL,
  SNACKS_LABEL, IDENTITY_LABEL, STEPS,
} from './constants'

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchData(id: string, code: string) {
  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('id, random_code, chinese_name, passport_name, dharma_name, identity, gender, age, email, phone, member_id, student_id, status, payment_plan, payment_status, residence, registration_phase')
    .eq('id', id)
    .eq('random_code', code.toUpperCase())
    .single()

  if (!reg) return { reg: null, lodging: null, schedCfg: null, error: '找不到報名資料' }
  if (reg.status !== 'approved') return { reg, lodging: null, schedCfg: null, error: '尚未錄取，無法填寫食宿登記' }

  const { data: lodging } = await supabaseAdmin
    .from('lodging_registrations')
    .select('*')
    .eq('registration_id', reg.id)
    .maybeSingle()

  const { data: scData } = await supabaseAdmin
    .from('site_config')
    .select('value')
    .eq('key', 'schedule_config')
    .maybeSingle()
  const schedCfg = (scData?.value ?? {}) as ScheduleConfig

  return { reg, lodging, schedCfg, error: null }
}

// ─── Form defaults ────────────────────────────────────────────────────────────

type FormData = Record<string, string>

function buildFormDefaults(reg: any, lodging: any): FormData {
  const planCode = reg.payment_plan || ''
  const planInfo = PLAN_INFO[planCode]
  const planCheckin = planInfo?.checkin || ''

  if (lodging) {
    const rawCheckin = lodging.arrival_date || ''
    const form: FormData = {
      checkin_date: FULL_DATE_TO_CHECKIN[rawCheckin] || rawCheckin || planCheckin,
      emergency_name: lodging.emergency_name || '',
      emergency_relation: lodging.emergency_relation || '',
      emergency_phone: lodging.emergency_phone || '',
      arrival_transport: lodging.arrival_transport || '',
      departure_transport: lodging.departure_transport || '',
      bus_destination: lodging.bus_destination || '',
      diet: lodging.diet || '',
      noon_fasting: lodging.noon_fasting || '',
      dinner_need: lodging.dinner_0819 || lodging.dinner_0824 ? 'yes' : 'no',
      snacks: lodging.snacks || '',
      dinner_0819: lodging.dinner_0819 ? 'true' : '',
      dinner_0824: lodging.dinner_0824 ? 'true' : '',
      snoring: lodging.snoring ? 'true' : '',
      agree_covid_rules: lodging.agree_covid_rules ? 'true' : '',
      id_front_url: lodging.id_front_url || '',
      id_back_url: lodging.id_back_url || '',
      passport_url: lodging.passport_url || '',
      arc_url: lodging.arc_url || '',
      photo_url: lodging.photo_url || '',
      arrival_ticket_url: lodging.arrival_ticket_url || '',
      departure_ticket_url: lodging.departure_ticket_url || '',
      test_0817_url: lodging.test_0817_url || '',
      test_0819_url: lodging.test_0819_url || '',
      flight_arrival_date: lodging.flight_arrival_date || '',
      flight_arrival_time: lodging.flight_arrival_time || '',
      flight_departure_date: lodging.flight_departure_date || '',
      flight_departure_time: lodging.flight_departure_time || '',
    }
    return form
  }

  // New registration — default form
  const form: FormData = {
    checkin_date: planCheckin,
    emergency_name: '', emergency_relation: '', emergency_phone: '',
    arrival_transport: '', departure_transport: '', bus_destination: '',
    diet: 'vegetarian', noon_fasting: '', dinner_need: '',
    snacks: 'drink_only', dinner_0819: '', dinner_0824: '',
    snoring: '', agree_covid_rules: '',
    id_front_url: '', id_back_url: '', passport_url: '', arc_url: '',
    photo_url: '', arrival_ticket_url: '', departure_ticket_url: '',
    test_0817_url: '', test_0819_url: '',
    flight_arrival_date: '', flight_arrival_time: '',
    flight_departure_date: '', flight_departure_time: '',
  }
  return form
}

function deriveIdentityType(reg: any, lodging: any, form: FormData): string {
  if (form.identity_type) return form.identity_type
  if (lodging) {
    if (lodging.arc_url) return 'arc'
    if (lodging.id_front_url) return 'id'
    if (lodging.passport_url) return 'passport'
  }
  return reg.residence === '台灣' ? 'id' : 'passport'
}

// ─── Per-step visible fields ──────────────────────────────────────────────────

const STEP1_FIELDS = new Set([
  'checkin_date', 'emergency_name', 'emergency_relation', 'emergency_phone',
  'arrival_transport', 'departure_transport', 'bus_destination',
])
const STEP2_FIELDS = new Set(['diet', 'noon_fasting', 'dinner_need', 'snacks'])
const STEP3_FIELDS = new Set(['identity_type'])
const STEP4_FIELDS = new Set([
  'flight_arrival_date', 'flight_arrival_time',
  'flight_departure_date', 'flight_departure_time',
])
const STEP5_FIELDS = new Set(['agree_covid_rules', 'snoring'])

// ─── Helper components ────────────────────────────────────────────────────────

function HiddenFields(form: FormData, step: number) {
  const currentFields = step === 1 ? STEP1_FIELDS : step === 2 ? STEP2_FIELDS : step === 3 ? STEP3_FIELDS : step === 4 ? STEP4_FIELDS : step === 5 ? STEP5_FIELDS : new Set<string>()
  const keys = Object.keys(form)
  return (
    <>
      {keys.map(k =>
        currentFields.has(k) ? null : (
          <input key={k} type="hidden" name={k} value={form[k] || ''} />
        )
      )}
    </>
  )
}

function Radio({
  group, value, label, form, locked, sub,
}: {
  group: string; value: string; label: React.ReactNode; form: FormData; locked: boolean; sub?: string
}) {
  const checked = form[group] === value
  return (
    <label key={value} className={`opt ${checked ? 'selected' : ''}`}>
      <input type="radio" name={group} value={value} defaultChecked={checked} disabled={locked} />
      <span className="opt-text">
        {label}
        {sub && <small>{sub}</small>}
      </span>
    </label>
  )
}

function FileFieldInline({
  kind, label, required, currentUrl, disabled, error,
}: {
  kind: string; label: string; required?: boolean; currentUrl: string; disabled: boolean; error?: boolean
}) {
  const isImage = currentUrl && !currentUrl.toLowerCase().endsWith('.pdf')
  const inputId = `file-${kind}`
  const filename = currentUrl ? currentUrl.split('/').pop() || '已上傳檔案' : ''
  return (
    <div>
      <label className="form-label">{label}{required && <span className="required">*</span>}</label>
      {currentUrl ? (
        <div className="uploaded-preview" style={{ marginBottom: 8 }}>
          <div className="thumb">{isImage ? <img src={currentUrl} alt={kind} /> : '📄'}</div>
          <div className="info">
            <div className="filename">{filename}</div>
            <div className="upload-time">已上傳</div>
          </div>
          <div className="actions">
            {isImage
              ? <a href={currentUrl} target="_blank" rel="noreferrer" className="view-link">檢視</a>
              : <a href={currentUrl} target="_blank" rel="noreferrer" className="view-link">開啟</a>}
          </div>
        </div>
      ) : null}
      <label htmlFor={inputId} className={`upload-box ${currentUrl ? 'has-file' : ''}`}
        style={error ? { borderColor: 'var(--error)', background: 'rgba(184,82,58,0.05)' } : undefined}>
        <div className="upload-icon">{currentUrl ? '✓' : '📤'}</div>
        <div className="upload-text">{currentUrl ? '點此重新上傳' : '點此選擇檔案'}</div>
        <div className="upload-hint">JPG / PNG / WEBP / PDF（5MB 以下）</div>
        <input id={inputId} type="file" name={`${kind}_file`}
          accept="image/jpeg,image/png,image/webp,application/pdf" disabled={disabled} />
      </label>
      <input type="hidden" name={`${kind}_url`} value={currentUrl} />
    </div>
  )
}

function LocationMap({ label, src }: { label: string; src: string }) {
  return (
    <details style={{ marginTop: 4 }}>
      <summary style={{ fontSize: 12.5, color: 'var(--ink-mute)', cursor: 'pointer', fontWeight: 600 }}>{label}</summary>
      <a href={src} target="_blank" rel="noreferrer"
        style={{ display: 'block', padding: 0, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-pure)', width: '100%', marginTop: 6 }}>
        <img src={src} alt={label} style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }} />
      </a>
    </details>
  )
}

function ReviewRow({ k, v }: { k: string; v: string | undefined }) {
  const empty = !v || v === '' || v === '—'
  return (
    <div className="review-row">
      <span className="k">{k}</span>
      <span className={`v ${empty ? 'empty' : ''}`}>{empty ? '未填寫' : v}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default async function Lodging2Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await props.searchParams
  const id = (sp.id as string) || ''
  const code = (sp.code as string) || ''
  const stepParam = parseInt(sp.step as string) || 1
  const step = Math.min(Math.max(stepParam, 1), STEPS.length)
  const queryError = (sp.error as string) || ''

  if (!id || !code) {
    return <ErrorPage msg="網址缺少必要參數，請從錄取通知信的連結進入" dashboardUrl="/member" />
  }

  const { reg, lodging, schedCfg, error: fetchError } = await fetchData(id, code)
  if (fetchError || !reg) {
    return <ErrorPage msg={fetchError || '載入失敗'} dashboardUrl={`/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`} />
  }

  const dashboardUrl = `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}`

  // Lodging state
  const hasExisting = !!lodging
  const hasEdited = hasExisting && lodging.updated_at !== lodging.created_at
  const locked = !!hasEdited

  // Deadline
  const lodgingPhase = (reg.registration_phase === 'late' ? 'late' : 'open') as 'open' | 'late'
  const deadlineMs = getLodgingDeadlineMs(schedCfg, lodgingPhase)
  const pastDeadline = Date.now() > deadlineMs
  const deadlineDot = msToDotLabel(deadlineMs)
  const deadlineDay = msToDayLabel(deadlineMs)
  const deadlineTime = msToTimeLabel(deadlineMs)
  const qt1Ms = getQuicktestDeadline1Ms(schedCfg)
  const qt2Ms = getQuicktestDeadline2Ms(schedCfg)
  const qt1Day = msToDayLabel(qt1Ms)
  const qt2Day = msToDayLabel(qt2Ms)

  // Build form: defaults + draft override
  const cs = await cookies()
  const defaults = buildFormDefaults(reg, lodging)
  const draftStr = cs.get('lodging2_draft')?.value || '{}'
  let draft: FormData = {}
  try { draft = JSON.parse(draftStr) } catch {}
  const form: FormData = { id, code, step: String(step), ...defaults, ...draft }

  // Derived fields
  if (form.dinner_need === 'yes') { form.dinner_0819 = 'true'; form.dinner_0824 = 'true' }
  else if (form.dinner_need === 'no') { form.dinner_0819 = ''; form.dinner_0824 = '' }

  const identityType = deriveIdentityType(reg, lodging, form)
  form.identity_type = identityType

  const initial = reg.chinese_name?.charAt(0) || '?'
  const isDomestic = reg.residence === '台灣'
  const planCode = reg.payment_plan || ''
  const planData = planCode ? PLAN_INFO[planCode] : null

  // ─── Read-only / expired render ────────────────────────────────────────────
  if (pastDeadline || (locked && hasExisting)) {
    return (
      <PageShell dashboardUrl={dashboardUrl} reg={reg} schedCfg={schedCfg}
        deadlineDot={deadlineDot} deadlineDay={deadlineDay} deadlineTime={deadlineTime}
        pastDeadline={pastDeadline} locked={locked} hasExisting={hasExisting} hasEdited={hasEdited}
        lodging={lodging} initial={initial} planData={planData} planCode={planCode}
        identityType={identityType} isDomestic={isDomestic} qt1Day={qt1Day} qt2Day={qt2Day}
        form={form} queryError={queryError} step={step} readonly={true} />
    )
  }

  // ─── Editable render ───────────────────────────────────────────────────────
  const readonly = false
  const stepperPct = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <PageShell dashboardUrl={dashboardUrl} reg={reg} schedCfg={schedCfg}
      deadlineDot={deadlineDot} deadlineDay={deadlineDay} deadlineTime={deadlineTime}
      pastDeadline={pastDeadline} locked={locked} hasExisting={hasExisting} hasEdited={hasEdited}
      lodging={lodging} initial={initial} planData={planData} planCode={planCode}
      identityType={identityType} isDomestic={isDomestic} qt1Day={qt1Day} qt2Day={qt2Day}
      form={form} queryError={queryError} step={step} readonly={readonly}
      stepperPct={stepperPct}>
      <form action={handleStep} method="POST" encType="multipart/form-data">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="step" value={step} />
        {HiddenFields(form, step)}

        <div className="form-card">

          {/* ===== Step 1: 行程安排 ===== */}
          {step === 1 && <Step1Content form={form} locked={locked} isDomestic={isDomestic} />}

          {/* ===== Step 2: 飲食偏好 ===== */}
          {step === 2 && <Step2Content form={form} locked={locked} />}

          {/* ===== Step 3: 身份類別 ===== */}
          {step === 3 && <Step3Content form={form} locked={locked} identityType={identityType} />}

          {/* ===== Step 4: 證件上傳 ===== */}
          {step === 4 && <Step4Content form={form} locked={locked} identityType={identityType} qt1Day={qt1Day} qt2Day={qt2Day} />}

          {/* ===== Step 5: 確認送出 ===== */}
          {step === 5 && <Step5Content form={form} locked={locked} identityType={identityType} />}

        </div>

        {/* Global error */}
        {queryError && (
          <div className="alert-card" style={{ marginTop: 18, position: 'sticky', bottom: 16, zIndex: 10 }}>
            <div className="alert-card-title">{queryError}</div>
            <p>
              <a href={`/lodging2?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&step=${step}`}
                className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                我知道了
              </a>
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="form-actions">
          {step > 1 ? (
            <button type="submit" name="action" value="prev" className="btn btn-ghost">← 上一步</button>
          ) : (
            <a href={dashboardUrl} className="btn btn-ghost">← 返回</a>
          )}
          {step < STEPS.length ? (
            <button type="submit" name="action" value="next" className="btn btn-primary">
              下一步 <span className="arrow">→</span>
            </button>
          ) : (
            <button type="submit" name="action" value="next"
              disabled={pastDeadline || locked}
              className="btn btn-primary">
              {pastDeadline ? '已截止' : locked ? '已修改過 1 次' : hasExisting ? '送出修改（最後 1 次）' : '提交食宿登記'}
              <span className="arrow">→</span>
            </button>
          )}
        </div>

        {step === STEPS.length && !locked && !pastDeadline && (
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12.5, color: 'var(--ink-mute)' }}>
            {hasExisting
              ? '本次為最後 1 次修改機會，送出後即鎖定。'
              : `送出後可於 ${deadlineDay} ${deadlineTime}前再修改 1 次，系統會寄出確認信。`}
          </p>
        )}
      </form>
    </PageShell>
  )
}

// ─── Step Contents ────────────────────────────────────────────────────────────

function Step1Content({ form, locked, isDomestic }: { form: FormData; locked: boolean; isDomestic: boolean }) {
  return (
    <div className="step-content active">
      <div className="step-header">
        <p className="step-header-kicker">Step 01</p>
        <h2 className="step-header-title">行程安排</h2>
        <p className="step-header-desc">請填寫緊急聯絡人，並選擇前往與離開日月潭的方式。</p>
      </div>

      <div className="alert-card">
        <div className="alert-card-title">重要提醒</div>
        <p>請慎重考慮並如實填寫。由於飯店條款限制，學會已先代墊食宿等費用，<strong>若取消報名，所付費用恕不退款、轉讓</strong>。感謝您的諒解。請確認您能全然接受主辦單位在課程期間對課程及防疫措施的安排。</p>
        <p>本表單送出後僅能再修改一次（共 2 次送出機會），請務必確認後再送出。</p>
        <p>表單成功提交後，系統將自動發送確認通知至您的電子信箱，請注意查收（含垃圾郵件）。</p>
      </div>

      <div className="info-card">
        <h4><span className="icon">🏨</span>日月潭湖畔會館入住說明</h4>
        <table style={{ fontSize: 13.5, marginBottom: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ color: 'var(--ink-mute)', paddingRight: 12, whiteSpace: 'nowrap', verticalAlign: 'top' }}>地點</td>
              <td>日月潭湖畔會館<br /><span style={{ color: 'var(--ink-mute)', fontSize: 12.5 }}>Sun Moon Lake Lakeside Resort</span></td>
            </tr>
            <tr>
              <td style={{ color: 'var(--ink-mute)', paddingRight: 12, whiteSpace: 'nowrap', verticalAlign: 'top', paddingTop: 6 }}>地址</td>
              <td style={{ paddingTop: 6 }}>南投縣魚池鄉日月中正路101號<br /><span style={{ color: 'var(--ink-mute)', fontSize: 12.5 }}>No. 101, Zhongzheng Rd., Yuchi Township, Nantou County 555, Taiwan</span></td>
            </tr>
          </tbody>
        </table>
        <ul>
          <li>日月潭湖畔會館辦理入住時間：每日下午 3 點後辦理入住。</li>
          <li>辦理入住時請攜帶<strong>身分證 + 健保卡（國內）或護照正本（國外）</strong>。</li>
          <li>房間一律 4 人一房，採單獨床位配置，附 2 套衛浴。</li>
          <li>每間房間皆有對外窗戶，舒適寬敞，可曬衣。</li>
          <li>請<strong>自備盥洗用具、衣架與雨具</strong>，會館不提供一次性盥洗用品。</li>
        </ul>
      </div>

      <div className="field-group" id="field-checkin_date">
        <div className="field-group-title"><span className="num">01</span>入住日期 <span className="required">*</span></div>
        <div className="opt-group inline" id="field-checkin_date">
          {Radio({ group: 'checkin_date', value: '8/18', label: '8/18 入住', form, locked })}
          {Radio({ group: 'checkin_date', value: '8/19', label: '8/19 入住', form, locked })}
          {Radio({ group: 'checkin_date', value: '8/20', label: '8/20 入住', form, locked })}
        </div>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">02</span>緊急聯絡人</div>
        <div className="field-row three">
          <div id="field-emergency_name">
            <label className="form-label">姓名 <span className="required">*</span></label>
            <input className="form-input" name="emergency_name" defaultValue={form.emergency_name} disabled={locked} />
          </div>
          <div id="field-emergency_relation">
            <label className="form-label">關係 <span className="required">*</span></label>
            <input className="form-input" name="emergency_relation" placeholder="例：配偶、父母、朋友" defaultValue={form.emergency_relation} disabled={locked} />
          </div>
          <div id="field-emergency_phone">
            <label className="form-label">聯絡電話 <span className="required">*</span></label>
            <input className="form-input" name="emergency_phone" placeholder="請加國碼，例：886+" defaultValue={form.emergency_phone} disabled={locked} />
          </div>
        </div>
      </div>

      <div className="field-group" id="field-arrival_transport">
        <div className="field-group-title"><span className="num">03</span>前往日月潭方式 <span className="required">*</span></div>
        <div className="opt-group">
          {Radio({ group: 'arrival_transport', value: 'self', label: '8/19 自行抵達日月潭湖畔會館', form, locked })}
          {Radio({ group: 'arrival_transport', value: 'taipei_bus', label: '主辦專車：8/19 上午 8:30 台北車站東 3 門集合', form, locked, sub: '法工人員穿著學會背心' })}
          {form.arrival_transport === 'taipei_bus' && (
            <div className="branch active">
              <LocationMap label="台北車站位置示意圖（集合點：東三門全家與郵局樓梯口）"
                src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/taipei-station.jpg" />
            </div>
          )}
          {Radio({ group: 'arrival_transport', value: 'wuri_bus', label: '主辦專車：8/19 上午 9:30 烏日高鐵站 6 號出口 7-8 號月台', form, locked, sub: '法工人員穿著學會背心' })}
          {form.arrival_transport === 'wuri_bus' && (
            <div className="branch active">
              <LocationMap label="台中高鐵站一樓 6 號出口示意圖"
                src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/wuri-hsr.jpg" />
            </div>
          )}
          {Radio({ group: 'arrival_transport', value: 'airport_bus_0819', label: '主辦專車：8/19 下午 02:30～03:00 桃園機場第一航廈接機大廳右邊集合', form, locked, sub: '法工人員穿著學會背心' })}
          {form.arrival_transport === 'airport_bus_0819' && (
            <div className="branch active">
              <LocationMap label="桃園機場第一航廈一樓集合點示意圖"
                src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/taoyuan-airport-t1.jpg" />
            </div>
          )}
          {Radio({ group: 'arrival_transport', value: 'self_0820', label: '8/20 上午 8:00 前自行抵達日月潭湖畔會館', form, locked })}
        </div>
        {!isDomestic && (form.arrival_transport === 'self' || form.arrival_transport === 'self_0820') && (
          <div className="alert-card" style={{ marginTop: 12 }}>
            <div className="alert-card-title">國外學員自行前往可聯絡</div>
            <ul>
              <li>桃園機場計程車預約電話：03-3834499</li>
              <li>台灣大車隊計程車手機直撥：55688</li>
              <li>大都會計程車手機直撥：55178</li>
            </ul>
          </div>
        )}
      </div>

      <div className="field-group" id="field-departure_transport">
        <div className="field-group-title"><span className="num">04</span>離開日月潭湖畔會館方式 <span className="required">*</span></div>
        <div className="opt-group">
          {Radio({ group: 'departure_transport', value: 'self', label: '自行離開', form, locked })}
          {Radio({ group: 'departure_transport', value: 'bus', label: '乘坐主辦單位安排專車', form, locked })}
        </div>
        {form.departure_transport === 'bus' && (
          <div className="branch active" id="field-bus_destination">
            <label className="form-label">專車目的地 <span className="required">*</span></label>
            <div className="opt-group">
              {Radio({ group: 'bus_destination', value: 'taipei_824_pm', label: '8/24 下午 6:00–6:30 專車到台北車站', form, locked })}
              {Radio({ group: 'bus_destination', value: 'taipei_825_am', label: '8/25 上午 9:00 專車到台北車站', form, locked })}
              {Radio({ group: 'bus_destination', value: 'wuri_825_am', label: '8/25 上午 9:00 專車到烏日高鐵', form, locked })}
              {Radio({ group: 'bus_destination', value: 'taoyuan_824_pm', label: <>8/24 下午 5:30–6:00 專車接送至台中高鐵站。<br />搭乘8/24晚上飛機返程的學員，請自行由台中高鐵站搭乘高鐵前往桃園機場。</>, form, locked })}
              {Radio({ group: 'bus_destination', value: 'taoyuan_825_am', label: '8/25 上午 9:00 專車到桃園機場第一航廈', form, locked, sub: '車程約 3 小時' })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Step2Content({ form, locked }: { form: FormData; locked: boolean }) {
  return (
    <div className="step-content active">
      <div className="step-header">
        <p className="step-header-kicker">Step 02</p>
        <h2 className="step-header-title">飲食偏好</h2>
        <p className="step-header-desc">請選擇飲食類型與晚餐安排，過午不食則於 12 點前用餐。</p>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">01</span>飲食選擇 <span className="required">*</span></div>
        <div id="field-diet" className="opt-group inline">
          {Radio({ group: 'diet', value: 'meat', label: '葷食', form, locked })}
          {Radio({ group: 'diet', value: 'vegetarian', label: '素食', form, locked })}
        </div>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">02</span>是否過午不食 <span className="required">*</span></div>
        <div id="field-noon_fasting" className="opt-group inline">
          {Radio({ group: 'noon_fasting', value: 'before_noon', label: '是（中午12點前用餐）', form, locked })}
          {Radio({ group: 'noon_fasting', value: 'fasting_no', label: '否', form, locked })}
        </div>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">03</span>是否需要安排晚餐 <span className="required">*</span></div>
        <div id="field-dinner_need" className="opt-group inline">
          {Radio({ group: 'dinner_need', value: 'yes', label: '需要', form, locked })}
          {Radio({ group: 'dinner_need', value: 'no', label: '不需要', form, locked })}
        </div>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">04</span>茶點需求 <span className="required">*</span></div>
        <div id="field-snacks" className="opt-group inline">
          {Radio({ group: 'snacks', value: 'snacks_and_drink', label: '需要茶點、咖啡 OR 茶', form, locked })}
          {Radio({ group: 'snacks', value: 'drink_only', label: '只需要咖啡 OR 茶', form, locked })}
        </div>
      </div>
    </div>
  )
}

function Step3Content({ form, locked, identityType }: { form: FormData; locked: boolean; identityType: string }) {
  return (
    <div className="step-content active">
      <div className="step-header">
        <p className="step-header-kicker">Step 03</p>
        <h2 className="step-header-title">身份類別</h2>
        <p className="step-header-desc">請選擇您的身份，以決定需要上傳的證件類型。</p>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">01</span>申請人身份 <span className="required">*</span></div>
        <div className="opt-group">
          <label className={`opt ${identityType === 'id' ? 'selected' : ''}`}>
            <input type="radio" name="identity_type" value="id" defaultChecked={identityType === 'id'} disabled={locked} />
            <span className="opt-text"><strong>台灣人</strong>（上傳身分證正反面）</span>
          </label>
          <label className={`opt ${identityType === 'passport' ? 'selected' : ''}`}>
            <input type="radio" name="identity_type" value="passport" defaultChecked={identityType === 'passport'} disabled={locked} />
            <span className="opt-text">
              <strong>外籍短期旅客</strong>
              <small>觀光／免簽／短期簽證入境，上傳護照 + 填寫航班資訊</small>
            </span>
          </label>
          <label className={`opt ${identityType === 'arc' ? 'selected' : ''}`}>
            <input type="radio" name="identity_type" value="arc" defaultChecked={identityType === 'arc'} disabled={locked} />
            <span className="opt-text"><strong>在台外籍居民</strong>（上傳 ARC／居留證）</span>
          </label>
        </div>
      </div>
    </div>
  )
}

function Step4Content({ form, locked, identityType, qt1Day, qt2Day }: {
  form: FormData; locked: boolean; identityType: string; qt1Day: string; qt2Day: string
}) {
  return (
    <div className="step-content active">
      <div className="step-header">
        <p className="step-header-kicker">Step 04</p>
        <h2 className="step-header-title">證件上傳</h2>
        <p className="step-header-desc">支援 JPG / PNG / WEBP / PDF（5MB 以下）。請依您的身份類別上傳對應證件。</p>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">01</span>個人相片 <span className="required">*</span></div>
        <div id="field-photo">
          <FileFieldInline kind="photo" label="個人相片（最近 3 個月內，勿使用美顏）"
            currentUrl={form.photo_url} disabled={locked} />
        </div>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">02</span>申請人身份（三選一）<span className="required">*</span></div>
        <div className="opt-group">
          <label className={`opt ${identityType === 'id' ? 'selected' : ''}`}>
            <input type="radio" name="identity_type" value="id" defaultChecked={identityType === 'id'} disabled={locked} />
            <span className="opt-text"><strong>台灣人</strong>（上傳身分證正反面）</span>
          </label>
          <label className={`opt ${identityType === 'passport' ? 'selected' : ''}`}>
            <input type="radio" name="identity_type" value="passport" defaultChecked={identityType === 'passport'} disabled={locked} />
            <span className="opt-text">
              <strong>外籍短期旅客</strong>
              <small>觀光／免簽／短期簽證入境，上傳護照 + 填寫航班資訊</small>
            </span>
          </label>
          <label className={`opt ${identityType === 'arc' ? 'selected' : ''}`}>
            <input type="radio" name="identity_type" value="arc" defaultChecked={identityType === 'arc'} disabled={locked} />
            <span className="opt-text"><strong>在台外籍居民</strong>（上傳 ARC／居留證）</span>
          </label>
        </div>

        {identityType === 'id' && (
          <div className="branch active">
            <div className="field-row">
              <div id="field-id_front">
                <FileFieldInline kind="id_front" label="身分證正面" required currentUrl={form.id_front_url} disabled={locked} />
              </div>
              <div id="field-id_back">
                <FileFieldInline kind="id_back" label="身分證反面" required currentUrl={form.id_back_url} disabled={locked} />
              </div>
            </div>
          </div>
        )}
        {identityType === 'passport' && (
          <div className="branch active">
            <div id="field-passport">
              <FileFieldInline kind="passport" label="護照" required currentUrl={form.passport_url} disabled={locked} />
            </div>
          </div>
        )}
        {identityType === 'arc' && (
          <div className="branch active">
            <div id="field-arc">
              <FileFieldInline kind="arc" label="ARC／居留證" required currentUrl={form.arc_url} disabled={locked} />
            </div>
          </div>
        )}
      </div>

      {identityType === 'passport' && (
        <div className="field-group">
          <div className="field-group-title"><span className="num">03</span>航班資訊（外籍短期旅客必填）</div>
          <div className="field-row">
            <div id="field-flight_arrival_date">
              <label className="form-label">抵台航班日期（入境日）<span className="required">*</span></label>
              <input type="date" className="form-input" name="flight_arrival_date" defaultValue={form.flight_arrival_date} disabled={locked} />
            </div>
            <div id="field-flight_arrival_time">
              <label className="form-label">抵台航班具體時間 <span className="required">*</span></label>
              <input type="text" className="form-input" name="flight_arrival_time" placeholder="例：14:30" defaultValue={form.flight_arrival_time} disabled={locked} />
            </div>
            <div id="field-flight_departure_date">
              <label className="form-label">離台航班日期（離境日）<span className="required">*</span></label>
              <input type="date" className="form-input" name="flight_departure_date" defaultValue={form.flight_departure_date} disabled={locked} />
            </div>
            <div id="field-flight_departure_time">
              <label className="form-label">離台航班具體時間 <span className="required">*</span></label>
              <input type="text" className="form-input" name="flight_departure_time" placeholder="例：16:45" defaultValue={form.flight_departure_time} disabled={locked} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            <FileFieldInline kind="arrival_ticket" label="上傳來台機票（非必填）" currentUrl={form.arrival_ticket_url} disabled={locked} />
            <FileFieldInline kind="departure_ticket" label="上傳離台機票（非必填）" currentUrl={form.departure_ticket_url} disabled={locked} />
          </div>
        </div>
      )}

      <div className="alert-card">
        <div className="alert-card-title">關於快篩檢測上傳</div>
        <p>快篩檢測時程在課程開始前後（{qt1Day}、{qt2Day}、8/20、8/22）。請完成本食宿登記後，另行於專屬頁面上傳。確認信中會附上快篩上傳頁連結。</p>
      </div>
    </div>
  )
}

function Step5Content({ form, locked, identityType }: { form: FormData; locked: boolean; identityType: string }) {
  return (
    <div className="step-content active">
      <div className="step-header">
        <p className="step-header-kicker">Step 05</p>
        <h2 className="step-header-title">確認資料並送出</h2>
        <p className="step-header-desc">請閱讀並同意防疫規範，確認以下資料無誤後送出。</p>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">01</span>防疫與課程規範</div>
        <div className="rules-block">
          <h5>傳染病相關</h5>
          <ul>
            <li>若在課程前幾天<strong>感冒確診</strong>並仍具傳染力，<strong>必須取消課程</strong>。</li>
            <li>若在課程會場<strong>被檢驗出陽性</strong>，同寢室 4 人需在房間隔離，並透過 ZOOM 線上上課及互動。</li>
            <li>若出現發燒、咳嗽、呼吸急促、胸悶、頭痛、喉嚨痛等症狀，需接受個別檢測；即使陰性亦會移至後段座位。</li>
          </ul>
          <h5>快篩檢測時間</h5>
          <ul>
            <li>檢測結果必須<strong>載明檢測日期、報名序號、姓名</strong>，快篩試劑請自備。</li>
          </ul>
          <h5>課程期間規範</h5>
          <ul>
            <li>課程期間全程配戴口罩。</li>
            <li>課程期間一律停用手機等通訊設備。</li>
            <li>用餐時必須禁語。</li>
            <li>請務必全程佩戴學員證。</li>
            <li>為示尊重，未得老師允許，上課中請勿拍照、攝影或錄音。</li>
            <li>本次課程所有座位皆是座椅，請勿佔座位，離開時請記得將個人物品帶走。</li>
            <li>請勿攜帶貴重物品至會場，個人隨身物品請自行妥善保管。</li>
            <li>請穿著整齊、舒適且適宜聞法的衣著。</li>
            <li>會場長時開著冷氣，畏寒者可攜帶禦寒衣物（如圍巾、披肩、襪子等）。</li>
          </ul>
        </div>

        <label id="field-agree_covid_rules" className={`consent-check ${form.agree_covid_rules === 'true' ? 'selected' : ''}`}>
          <input type="checkbox" name="agree_covid_rules" value="true" defaultChecked={form.agree_covid_rules === 'true'} disabled={locked} />
          <span className="consent-check-txt">
            我已閱讀並<strong>願意遵守以上防疫與課程規範</strong> <span className="required">*</span>
          </span>
        </label>
      </div>

      <div className="field-group">
        <div className="field-group-title"><span className="num">02</span>其他</div>
        <div className="form-label" style={{ marginBottom: 8 }}>睡覺打鼾（提供同寢室友參考）</div>
        <div className="opt-group">
          {Radio({ group: 'snoring', value: '', label: '睡覺不打鼾', form, locked })}
          {Radio({ group: 'snoring', value: 'true', label: '睡覺會打鼾', form, locked })}
        </div>
      </div>

      <ReviewSection form={form} identityType={identityType} />
    </div>
  )
}

function ReviewSection({ form, identityType }: { form: FormData; identityType: string }) {
  return (
    <div className="field-group">
      <div className="field-group-title"><span className="num">03</span>資料確認</div>
      <div className="review-grid">
        <div className="review-group">
          <h4>行程安排</h4>
          <ReviewRow k="入住日期" v={form.checkin_date} />
          <ReviewRow k="緊急聯絡人" v={`${form.emergency_name}（${form.emergency_relation}）${form.emergency_phone}`} />
          <ReviewRow k="前往日月潭" v={TRANSPORT_LABEL[form.arrival_transport]} />
          <ReviewRow k="離開" v={form.departure_transport === 'self' ? '自行離開' : form.departure_transport === 'bus' ? `主辦專車（${BUS_DEST_LABEL[form.bus_destination] || '未選擇'}）` : ''} />
        </div>

        <div className="review-group">
          <h4>飲食偏好</h4>
          <ReviewRow k="飲食" v={DIET_LABEL[form.diet]} />
          <ReviewRow k="過午不食" v={NOON_LABEL[form.noon_fasting]} />
          <ReviewRow k="安排晚餐" v={DINNER_LABEL[form.dinner_need]} />
          <ReviewRow k="茶點" v={SNACKS_LABEL[form.snacks]} />
        </div>

        <div className="review-group">
          <h4>證件上傳</h4>
          <ReviewRow k="個人相片" v={form.photo_url ? '✓ 已上傳' : ''} />
          <ReviewRow k="申請人身份" v={IDENTITY_LABEL[identityType]} />
          {identityType === 'id' && (
            <>
              <ReviewRow k="身分證正面" v={form.id_front_url ? '✓ 已上傳' : ''} />
              <ReviewRow k="身分證反面" v={form.id_back_url ? '✓ 已上傳' : ''} />
            </>
          )}
          {identityType === 'passport' && (
            <>
              <ReviewRow k="護照" v={form.passport_url ? '✓ 已上傳' : ''} />
              <ReviewRow k="抵台航班" v={`${form.flight_arrival_date} ${form.flight_arrival_time}`} />
              <ReviewRow k="離台航班" v={`${form.flight_departure_date} ${form.flight_departure_time}`} />
            </>
          )}
          {identityType === 'arc' && (
            <ReviewRow k="ARC／居留證" v={form.arc_url ? '✓ 已上傳' : ''} />
          )}
          <ReviewRow k="同意防疫規範" v={form.agree_covid_rules === 'true' ? '✓ 已同意' : '尚未勾選'} />
          <ReviewRow k="睡覺會打鼾" v={form.snoring === 'true' ? '是' : '否'} />
        </div>
      </div>
    </div>
  )
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

function PageShell({
  children, dashboardUrl, reg, schedCfg,
  deadlineDot, deadlineDay, deadlineTime, pastDeadline, locked,
  hasExisting, hasEdited, lodging, initial, planData, planCode,
  identityType, isDomestic, qt1Day, qt2Day, form, queryError, step, readonly,
  stepperPct,
}: {
  children?: React.ReactNode
  dashboardUrl: string
  reg: any
  schedCfg: any
  deadlineDot: string
  deadlineDay: string
  deadlineTime: string
  pastDeadline: boolean
  locked: boolean
  hasExisting: boolean
  hasEdited: boolean
  lodging: any
  initial: string
  planData: any
  planCode: string
  identityType: string
  isDomestic: boolean
  qt1Day: string
  qt2Day: string
  form: FormData
  queryError: string
  step: number
  readonly: boolean
  stepperPct?: number
}) {
  const code = form.code || ''
  const stepperPctVal = stepperPct ?? ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href={dashboardUrl} className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Member Portal</small>
              <span>學員專區</span>
            </span>
          </a>
          <div className="nav-actions">
            <a href={dashboardUrl} className="nav-back">← 學員首頁</a>
          </div>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Food &amp; Lodging Registration</p>
          <h1 className="page-title">食宿登記表</h1>
          <p className="page-subtitle">
            請於 {deadlineDay.replace('/', ' 月 ')} 日台北時間{deadlineTime}前完成。<br />
            送出後僅能再修改一次（共 2 次送出機會）。
          </p>

          {/* Stepper */}
          <div className="stepper">
            <div className="stepper-track">
              <div className="stepper-line" />
              <div className="stepper-line-active" style={{ width: `${stepperPctVal}%` }} />
              {STEPS.map(s => {
                const status = s.num < step ? 'done' : s.num === step ? 'active' : ''
                const clickable = s.num <= step
                return (
                  <a key={s.num} href={clickable ? `/lodging2?id=${encodeURIComponent(form.id)}&code=${encodeURIComponent(code)}&step=${s.num}` : undefined}
                    className={`step ${status} ${clickable ? 'clickable' : ''}`}
                    style={!clickable ? { pointerEvents: 'none' } : undefined}>
                    <div className="step-num"><span className="n">{s.num}</span></div>
                    <div className="step-label">
                      <small>STEP 0{s.num}</small>
                      {s.label}
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="container">
        <div className="layout">
          <div>
            <div className="member-card">
              <div className="avatar">{initial}</div>
              <div className="info">
                <div className="name">{reg.chinese_name} 法友</div>
                <div className="meta">
                  <span><strong>報名序號</strong>{reg.member_id || '—'}</span>
                  <span><strong>學號</strong>{reg.student_id || '—'}</span>
                  <span><strong>專屬碼</strong>{code}</span>
                  <span><strong>繳費方案</strong>{planCode ? `${PLAN_INFO[planCode]?.label || planCode}（${PLAN_INFO[planCode]?.method || ''}）` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Status banners */}
            {hasExisting && !hasEdited && !pastDeadline && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>已送出（尚有 1 次修改機會）</h4>
                  <p>送出時間：{new Date(lodging.updated_at).toLocaleString('zh-TW')}　修改僅能進行一次。</p>
                </div>
              </div>
            )}

            {locked && !pastDeadline && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>已完成（已修改過 1 次，無法再改）</h4>
                  <p>最後修改時間：{new Date(lodging.updated_at).toLocaleString('zh-TW')}　以下為唯讀內容，如有錯誤請聯絡學會。</p>
                </div>
              </div>
            )}

            {pastDeadline && (
              <div className="submit-status" style={{ background: 'rgba(184, 82, 58, 0.08)', borderColor: 'rgba(184, 82, 58, 0.3)' }}>
                <div className="submit-status-icon" style={{ background: 'var(--error)' }}>!</div>
                <div className="submit-status-text">
                  <h4>食宿登記已截止</h4>
                  <p>食宿登記已於 <strong>{deadlineDay} {deadlineTime}</strong>（台北時間）截止，無法再提交。{hasExisting ? '以下為您送出的內容，僅供參考。' : ''}如有特殊狀況請聯絡學會。</p>
                </div>
              </div>
            )}

            {/* Readonly content */}
            {readonly && (
              <div className="form-card">
                <Step1Content form={form} locked={true} isDomestic={isDomestic} />
                <Step2Content form={form} locked={true} />
                <Step3Content form={form} locked={true} identityType={identityType} />
                <Step4Content form={form} locked={true} identityType={identityType} qt1Day={qt1Day} qt2Day={qt2Day} />
                <Step5Content form={form} locked={true} identityType={identityType} />
              </div>
            )}

            {/* Editable form */}
            {!readonly && children}
          </div>

          {/* Sidebar */}
          <aside>
            <div className="deadline-card">
              <div className="deadline-label">Deadline</div>
              <div className="deadline-date">{deadlineDot}</div>
              <div className="deadline-text">
                台北時間{deadlineTime}前完成<br />
                逾期將無法提交
              </div>
            </div>

            <div className="sidebar-card">
              <h4>學員資料 <small>Profile</small></h4>
              <div className="info-row">
                <span className="k">中文姓名</span>
                <span className="v">{reg.chinese_name || '—'}</span>
              </div>
              <div className="info-row">
                <span className="k">護照英文姓名</span>
                <span className="v" style={{ wordBreak: 'break-word', textAlign: 'right' }}>{reg.passport_name || '—'}</span>
              </div>
              {reg.dharma_name && (
                <div className="info-row">
                  <span className="k">法名</span>
                  <span className="v">{reg.dharma_name}</span>
                </div>
              )}
              <div className="info-row">
                <span className="k">手機</span>
                <span className="v">{reg.phone || '—'}</span>
              </div>
              <div className="info-row">
                <span className="k">Email</span>
                <span className="v" style={{ wordBreak: 'break-all', textAlign: 'right', fontSize: 12 }}>{reg.email || '—'}</span>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-mute)' }}>
                以上資料由報名表自動帶入，如需修改請聯絡學會。
              </p>
            </div>

            {planData && (() => {
              const statusLabel = PAYMENT_STATUS_LABEL[reg.payment_status] || reg.payment_status || '—'
              const isVerified = reg.payment_status === 'verified'
              return (
                <div className="sidebar-card" style={{ borderColor: isVerified ? 'rgba(45,106,79,0.35)' : 'rgba(180,147,88,0.3)', background: isVerified ? 'rgba(73,85,52,0.06)' : 'rgba(216,194,154,0.14)' }}>
                  <h4 style={{ color: isVerified ? 'var(--green-deep, #2d6a4f)' : 'var(--gold-deep)' }}>繳費方案 <small>Payment Plan</small></h4>
                  <div className="info-row">
                    <span className="k">方案</span>
                    <span className="v" style={{ fontWeight: 700 }}>{planData.label}（{planCode}）</span>
                  </div>
                  <div className="info-row">
                    <span className="k">日期</span>
                    <span className="v">{planData.date}</span>
                  </div>
                  <div className="info-row">
                    <span className="k">繳費方式</span>
                    <span className="v">{planData.method}</span>
                  </div>
                  <div className="info-row">
                    <span className="k">金額</span>
                    <span className="v" style={{ fontWeight: 600 }}>NT${planData.amount.toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="k">繳費狀態</span>
                    <span className="v" style={{ color: isVerified ? 'var(--green-deep, #2d6a4f)' : 'var(--ink-soft)', fontWeight: isVerified ? 700 : 400 }}>{statusLabel}</span>
                  </div>
                </div>
              )
            })()}

            <div className="sidebar-card" style={{ background: 'rgba(216, 194, 154, 0.18)', borderColor: 'rgba(180, 147, 88, 0.3)' }}>
              <h4 style={{ color: 'var(--gold-deep)' }}>※ 貼心提醒 <small>Tips</small></h4>
              <p>送出後僅能再修改 <strong>1 次</strong>（共 2 次送出機會），請務必確認後再送出。</p>
              <p style={{ marginTop: 10 }}>由於飯店條款限制，學會已先代墊食宿等費用，<strong>一旦繳費後取消報名，已付費用恕無法退款、轉讓</strong>。</p>
              <p style={{ marginTop: 10 }}>個人相片與證件影像務必<strong>清晰可辨</strong>，過糊將影響身份核對。</p>
            </div>

            <div className="sidebar-card">
              <h4>需要協助 <small>Help</small></h4>
              <p>聯絡學會：<br /><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></p>
              <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, display: 'block', marginTop: 10 }} />
              <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 6, marginBottom: 0 }}>請加入學會LINE官方帳號洽詢</p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處學會　All rights reserved.</div>
          <div>
            <h5 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'rgba(251,248,242,0.9)', letterSpacing: '0.1em' }}>聯絡我們</h5>
            <div style={{ marginBottom: 12 }}><a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'rgba(251,248,242,0.75)', fontSize: 14 }}>satipatthana.tw@gmail.com</a></div>
            <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.2)' }} />
            <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>請加入學會LINE官方帳號洽詢</p>
          </div>
        </div>
      </footer>
    </>
  )
}

// ─── Error page ───────────────────────────────────────────────────────────────

function ErrorPage({ msg, dashboardUrl }: { msg: string; dashboardUrl: string }) {
  return (
    <main className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-icon" style={{ background: 'linear-gradient(135deg,#cf8f6c,#8b4f32)' }}>!</div>
        <h1 className="login-title">無法載入</h1>
        <p className="login-subtitle">{msg}</p>
        <a href={dashboardUrl} className="btn btn-primary btn-block">前往學員專區</a>
      </div>
    </main>
  )
}
