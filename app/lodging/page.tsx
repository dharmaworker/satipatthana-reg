'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'
import { getLodgingDeadlineMs, msToDotLabel, msToDayLabel, msToTimeLabel, ScheduleConfig } from '@/lib/registration-period'

const STEPS = [
  { num: 1, label: '行程安排', en: 'Travel' },
  { num: 2, label: '飲食偏好', en: 'Diet' },
  { num: 3, label: '證件上傳', en: 'Documents' },
  { num: 4, label: '確認送出', en: 'Review' },
]

const TRANSPORT_LABEL: Record<string, string> = {
  self: '8/19 自行抵達日月潭湖畔會館',
  taipei_bus: '主辦專車：8/19 上午 8:30 台北車站東 3 門集合',
  wuri_bus: '主辦專車：8/19 上午 9:30 烏日高鐵站 6 號出口',
  airport_bus_0819: '主辦專車：8/19 下午 2:30 桃園機場第一航廈',
  self_0820: '8/20 上午 7 點前自行抵達日月潭湖畔會館',
}

const BUS_DEST_LABEL: Record<string, string> = {
  taipei_824_pm: '8/24 下午 6:00–6:30 專車到台北車站',
  taipei_825_am: '8/25 上午 9:00 專車到台北車站',
  wuri_825_am: '8/25 上午 9:00 專車到烏日高鐵',
  taoyuan_824_pm: '搭乘8/24 晚上的班機，請於台中高鐵站自行搭乘高鐵前往桃園機場。',
  taoyuan_825_am: '8/25 上午 9:00 專車到桃園機場第一航廈',
}

const PLAN_INFO: Record<string, { label: string; date: string; checkin: string; amount: number; method: string }> = {
  A1: { label: 'A 方案', date: '8/20 — 8/24', checkin: '8/20', amount: 18600, method: '匯款' },
  A2: { label: 'A 方案', date: '8/20 — 8/24', checkin: '8/20', amount: 19300, method: '刷卡' },
  B1: { label: 'B 方案', date: '8/19 — 8/24', checkin: '8/19', amount: 20350, method: '匯款' },
  B2: { label: 'B 方案', date: '8/19 — 8/24', checkin: '8/19', amount: 21050, method: '刷卡' },
  C1: { label: 'C 方案', date: '8/19 — 8/25', checkin: '8/19', amount: 22590, method: '匯款' },
  C2: { label: 'C 方案', date: '8/19 — 8/25', checkin: '8/19', amount: 23290, method: '刷卡' },
  D1: { label: 'D 方案', date: '8/20 — 8/25', checkin: '8/20', amount: 20840, method: '匯款' },
  D2: { label: 'D 方案', date: '8/20 — 8/25', checkin: '8/20', amount: 21540, method: '刷卡' },
}
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: '待繳費',
  paid: '已匯款（待確認）',
  verified: '✓ 已確認繳費',
}
const FULL_DATE_TO_CHECKIN: Record<string, string> = {
  '2026-08-18': '8/18', '2026-08-19': '8/19', '2026-08-20': '8/20',
}

const DIET_LABEL: Record<string, string> = { meat: '葷食', vegetarian: '素食' }
const NOON_LABEL: Record<string, string> = {
  before_noon: '是（中午12點前用餐）',
  fasting_no: '否',
}
const DINNER_LABEL: Record<string, string> = { yes: '需要', no: '不需要' }
const SNACKS_LABEL: Record<string, string> = { snacks_and_drink: '需要茶點、咖啡 OR 茶', drink_only: '只需要咖啡 OR 茶' }
const IDENTITY_LABEL: Record<string, string> = { id: '台灣人（身分證正反面）', passport: '外籍短期旅客（護照 + 航班）', arc: '在台外籍居民（ARC／居留證）' }

function LodgingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''
  const dashboardUrl = id && code ? `/member/dashboard?id=${id}&code=${encodeURIComponent(code)}` : '/member'

  const [reg, setReg] = useState<any>(null)
  const [schedCfg, setSchedCfg] = useState<ScheduleConfig | null>(null)
  const [existingLodging, setExistingLodging] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)

  const [form, setForm] = useState({
    checkin_date: '',
    emergency_name: '',
    emergency_relation: '',
    emergency_phone: '',
    arrival_transport: '',
    departure_transport: '',
    bus_destination: '',
    diet: 'vegetarian',
    noon_fasting: '',
    dinner_need: '',
    snacks: 'drink_only',
    dinner_0819: false,
    dinner_0824: false,
    snoring: false,
    agree_covid_rules: false,
    id_front_url: '',
    id_back_url: '',
    passport_url: '',
    arc_url: '',
    photo_url: '',
    arrival_ticket_url: '',
    departure_ticket_url: '',
    test_0817_url: '',
    test_0819_url: '',
    flight_arrival_date: '',
    flight_arrival_time: '',
    flight_departure_date: '',
    flight_departure_time: '',
  })
  const [errorField, setErrorField] = useState<string | null>(null)
  const update = (k: string, v: any) => {
    setForm(prev => ({ ...prev, [k]: v }))
    if (errorField === k) setErrorField(null)
    if (error) setError('')
  }
  const fail = (field: string, msg: string): false => {
    setError(msg)
    setErrorField(field)
    // 跨 step validate 時要等 setStep 後 React re-render 完，欄位才存在 DOM
    setTimeout(() => {
      const el = document.getElementById(`field-${field}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return false
  }
  const errCls = (f: string) => errorField === f ? 'error' : ''

  const [identityType, setIdentityType] = useState<'id' | 'passport' | 'arc'>('id')

  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const handleFileUpload = async (kind: string, file: File) => {
    setUploadingKind(kind)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/upload-lodging', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      update(`${kind}_url`, data.url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploadingKind(null)
    }
  }

  useEffect(() => {
    fetch('/api/phase-config').then(r => r.json()).then(d => setSchedCfg(d)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id || !code) {
      setError('網址缺少必要參數，請從錄取通知信的連結進入')
      setLoading(false)
      return
    }
    fetch(`/api/lodging?id=${id}&code=${encodeURIComponent(code)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '載入失敗')
        setReg(data.registration)
        const planCode = data.registration?.payment_plan || ''
        const planCheckin = PLAN_INFO[planCode]?.checkin || ''
        if (data.lodging) {
          setExistingLodging(data.lodging)
          const rawCheckin = data.lodging.arrival_date || ''
          setForm({
            checkin_date: FULL_DATE_TO_CHECKIN[rawCheckin] || rawCheckin || planCheckin,
            emergency_name: data.lodging.emergency_name || '',
            emergency_relation: data.lodging.emergency_relation || '',
            emergency_phone: data.lodging.emergency_phone || '',
            arrival_transport: data.lodging.arrival_transport || '',
            departure_transport: data.lodging.departure_transport || '',
            bus_destination: data.lodging.bus_destination || '',
            diet: data.lodging.diet || '',
            noon_fasting: data.lodging.noon_fasting || '',
            dinner_need: (data.lodging.dinner_0819 || data.lodging.dinner_0824) ? 'yes' : 'no',
            snacks: data.lodging.snacks || '',
            dinner_0819: !!data.lodging.dinner_0819,
            dinner_0824: !!data.lodging.dinner_0824,
            snoring: !!data.lodging.snoring,
            agree_covid_rules: !!data.lodging.agree_covid_rules,
            id_front_url: data.lodging.id_front_url || '',
            id_back_url: data.lodging.id_back_url || '',
            passport_url: data.lodging.passport_url || '',
            arc_url: data.lodging.arc_url || '',
            photo_url: data.lodging.photo_url || '',
            arrival_ticket_url: data.lodging.arrival_ticket_url || '',
            departure_ticket_url: data.lodging.departure_ticket_url || '',
            test_0817_url: data.lodging.test_0817_url || '',
            test_0819_url: data.lodging.test_0819_url || '',
            flight_arrival_date: data.lodging.flight_arrival_date || '',
            flight_arrival_time: data.lodging.flight_arrival_time || '',
            flight_departure_date: data.lodging.flight_departure_date || '',
            flight_departure_time: data.lodging.flight_departure_time || '',
          })
          // 已填過資料時，預設 4 步全可瀏覽
          setMaxReached(STEPS.length)
          if (data.lodging.arc_url) setIdentityType('arc')
          else if (data.lodging.id_front_url) setIdentityType('id')
          else if (data.lodging.passport_url) setIdentityType('passport')
          else setIdentityType(data.registration?.residence === '台灣' ? 'id' : 'passport')
        } else {
          setIdentityType(data.registration?.residence === '台灣' ? 'id' : 'passport')
          if (planCheckin) setForm(prev => ({ ...prev, checkin_date: planCheckin }))
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, code])

  const validateStep1 = (): boolean => {
    if (!form.checkin_date) return fail('checkin_date', '請選擇「入住日期」')
    if (!form.emergency_name) return fail('emergency_name', '請填寫「緊急聯絡人姓名」')
    if (!form.emergency_relation) return fail('emergency_relation', '請填寫「緊急聯絡人關係」')
    if (!form.emergency_phone) return fail('emergency_phone', '請填寫「緊急聯絡人電話」')
    if (!form.arrival_transport) return fail('arrival_transport', '請選擇「前往日月潭方式」')
    if (!form.departure_transport) return fail('departure_transport', '請選擇「離開日月潭湖畔會館方式」')
    if (form.departure_transport === 'bus' && !form.bus_destination) return fail('bus_destination', '請選擇「專車目的地」')
    return true
  }

  const validateStep2 = (): boolean => {
    if (!form.diet) return fail('diet', '請選擇「飲食」')
    if (!form.noon_fasting) return fail('noon_fasting', '請選擇「過午不食」')
    if (!form.dinner_need) return fail('dinner_need', '請選擇「是否需要安排晚餐」')
    if (!form.snacks) return fail('snacks', '請選擇「茶點需求」')
    return true
  }

  const validateStep3 = (): boolean => {
    if (!form.photo_url) return fail('photo', '請上傳「個人相片」')
    if (identityType === 'id') {
      if (!form.id_front_url) return fail('id_front', '請上傳「身分證正面」')
      if (!form.id_back_url) return fail('id_back', '請上傳「身分證反面」')
    } else if (identityType === 'passport') {
      if (!form.passport_url) return fail('passport', '請上傳「護照」')
      if (!form.flight_arrival_date) return fail('flight_arrival_date', '請填寫「抵台航班日期」')
      if (!form.flight_arrival_time) return fail('flight_arrival_time', '請填寫「抵台航班時間」')
      if (!form.flight_departure_date) return fail('flight_departure_date', '請填寫「離台航班日期」')
      if (!form.flight_departure_time) return fail('flight_departure_time', '請填寫「離台航班時間」')
    } else if (identityType === 'arc') {
      if (!form.arc_url) return fail('arc', '請上傳「ARC／居留證」')
    }
    return true
  }

  const validateStep4 = (): boolean => {
    if (!form.agree_covid_rules) return fail('agree_covid_rules', '請勾選「同意防疫與課程規範」')
    return true
  }

  const validateStep = (n: number): boolean => {
    if (n === 1) return validateStep1()
    if (n === 2) return validateStep2()
    if (n === 3) return validateStep3()
    return true // step 4 純 review
  }

  const lodgingPhase = (reg?.registration_phase === 'late' ? 'late' : 'open') as 'open' | 'late'
  const deadlineMs = getLodgingDeadlineMs(schedCfg, lodgingPhase)

  const goToStep = (target: number) => {
    if (target === step) return
    if (target < step) {
      setStep(target)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    for (let s = step; s < target; s++) {
      if (!validateStep(s)) {
        setStep(s)
        setMaxReached(prev => Math.max(prev, s))
        return
      }
    }
    setStep(target)
    setMaxReached(prev => Math.max(prev, target))
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (Date.now() > deadlineMs) {
      setError(`食宿登記已於 ${deadlineDay} ${deadlineTime}截止，請聯絡學會。`)
      return
    }
    if (!validateStep1()) { setStep(1); return }
    if (!validateStep2()) { setStep(2); return }
    if (!validateStep3()) { setStep(3); return }
    if (!validateStep4()) { setStep(4); return }

    const dinnerYes = form.dinner_need === 'yes'
    const payload: any = {
      ...form,
      dinner_0819: dinnerYes,
      dinner_0824: dinnerYes,
      identity_type: identityType,
    }
    if (identityType === 'id') {
      payload.passport_url = ''
      payload.arc_url = ''
    } else if (identityType === 'passport') {
      payload.id_front_url = ''
      payload.id_back_url = ''
      payload.arc_url = ''
    } else if (identityType === 'arc') {
      payload.id_front_url = ''
      payload.id_back_url = ''
      payload.passport_url = ''
      payload.flight_arrival_date = ''
      payload.flight_arrival_time = ''
      payload.flight_departure_date = ''
      payload.flight_departure_time = ''
      payload.arrival_ticket_url = ''
      payload.departure_ticket_url = ''
    }

    setSubmitting(true)
    setError('')
    setErrorField(null)
    try {
      const res = await fetch('/api/lodging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '送出失敗')
      const wasEdited = !!existingLodging
      if (data.lodging) setExistingLodging(data.lodging)
      router.push(`/lodging/success?id=${id}&code=${encodeURIComponent(code)}${wasEdited ? '&edited=1' : ''}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isDomestic = reg?.residence === '台灣'
  const pastDeadline = Date.now() > deadlineMs
  const deadlineDot = msToDotLabel(deadlineMs)
  const deadlineDay = msToDayLabel(deadlineMs)
  const deadlineTime = msToTimeLabel(deadlineMs)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    )
  }

  if (error && !reg) {
    return (
      <main className="login-wrap">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-icon" style={{ background: 'linear-gradient(135deg,#cf8f6c,#8b4f32)' }}>!</div>
          <h1 className="login-title">無法載入</h1>
          <p className="login-subtitle">{error}</p>
          <a href={dashboardUrl} className="btn btn-primary btn-block">前往學員專區</a>
        </div>
      </main>
    )
  }

  const hasEdited = !!(existingLodging && existingLodging.updated_at !== existingLodging.created_at)
  const locked = hasEdited

  const initial = reg?.chinese_name?.charAt(0) || '?'

  const radio = (group: string, value: string, label: React.ReactNode, sub?: string) => {
    const checked = (form as any)[group] === value
    return (
      <label key={value} className={`opt ${checked ? 'selected' : ''}`}>
        <input type="radio" name={group} value={value} checked={checked}
          onChange={() => update(group, value)} disabled={locked} />
        <span className="opt-text">
          {label}
          {sub && <small>{sub}</small>}
        </span>
      </label>
    )
  }

  const stepperPct = ((step - 1) / (STEPS.length - 1)) * 100

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
              <div className="stepper-line-active" style={{ width: `${stepperPct}%` }} />
              {STEPS.map(s => {
                const status = s.num < step ? 'done' : s.num === step ? 'active' : ''
                const clickable = s.num <= maxReached
                return (
                  <div key={s.num}
                    className={`step ${status} ${clickable ? 'clickable' : ''}`}
                    onClick={() => clickable && goToStep(s.num)}>
                    <div className="step-num"><span className="n">{s.num}</span></div>
                    <div className="step-label">
                      <small>STEP 0{s.num}</small>
                      {s.label}
                    </div>
                  </div>
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
                  <span><strong>繳費方案</strong>{reg.payment_plan ? `${PLAN_INFO[reg.payment_plan]?.label || reg.payment_plan}（${PLAN_INFO[reg.payment_plan]?.method || ''}）` : '—'}</span>
                </div>
              </div>
            </div>

            {done && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>食宿登記已送出</h4>
                  <p>
                    系統已寄出確認信至您的 Email。
                    {hasEdited
                      ? <> 本表單已修改過一次，無法再修改。若需更動請聯絡學會。</>
                      : <> 如需修改僅能再修改一次（{deadlineDay} {deadlineTime}前），修改後即無法再動。</>}
                  </p>
                </div>
              </div>
            )}

            {existingLodging && !hasEdited && !done && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>已送出（尚有 1 次修改機會）</h4>
                  <p>送出時間：{new Date(existingLodging.updated_at).toLocaleString('zh-TW')}　修改僅能進行一次。</p>
                </div>
              </div>
            )}

            {locked && !pastDeadline && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>已完成（已修改過 1 次，無法再改）</h4>
                  <p>最後修改時間：{new Date(existingLodging.updated_at).toLocaleString('zh-TW')}　以下為唯讀內容，如有錯誤請聯絡學會。</p>
                </div>
              </div>
            )}

            {pastDeadline && (
              <div className="submit-status" style={{ background: 'rgba(184, 82, 58, 0.08)', borderColor: 'rgba(184, 82, 58, 0.3)' }}>
                <div className="submit-status-icon" style={{ background: 'var(--error)' }}>!</div>
                <div className="submit-status-text">
                  <h4>食宿登記已截止</h4>
                  <p>食宿登記已於 <strong>{deadlineDay} {deadlineTime}</strong>（台北時間）截止，無法再提交。{existingLodging ? '以下為您送出的內容，僅供參考。' : ''}如有特殊狀況請聯絡學會。</p>
                </div>
              </div>
            )}

            <fieldset disabled={locked || pastDeadline} style={{ border: 'none', padding: 0, margin: 0 }}>
              <div className="form-card">

                {/* ============== Step 1：行程安排 ============== */}
                {step === 1 && (
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

                    {/* 入住日期 */}
                    <div className="field-group" id="field-checkin_date">
                      <div className="field-group-title"><span className="num">01</span>入住日期 <span className="required">*</span></div>
                      <div className="opt-group inline">
                        {radio('checkin_date', '8/18', '8/18 入住')}
                        {radio('checkin_date', '8/19', '8/19 入住')}
                        {radio('checkin_date', '8/20', '8/20 入住')}
                      </div>
                    </div>

                    {/* 緊急聯絡人 */}
                    <div className="field-group">
                      <div className="field-group-title"><span className="num">02</span>緊急聯絡人</div>
                      <div className="field-row three">
                        <div id="field-emergency_name">
                          <label className="form-label">姓名 <span className="required">*</span></label>
                          <input className={`form-input ${errCls('emergency_name')}`} value={form.emergency_name}
                            onChange={e => update('emergency_name', e.target.value)} />
                        </div>
                        <div id="field-emergency_relation">
                          <label className="form-label">關係 <span className="required">*</span></label>
                          <input className={`form-input ${errCls('emergency_relation')}`} placeholder="例：配偶、父母、朋友"
                            value={form.emergency_relation}
                            onChange={e => update('emergency_relation', e.target.value)} />
                        </div>
                        <div id="field-emergency_phone">
                          <label className="form-label">聯絡電話 <span className="required">*</span></label>
                          <input className={`form-input ${errCls('emergency_phone')}`} placeholder="請加國碼，例：886+"
                            value={form.emergency_phone}
                            onChange={e => update('emergency_phone', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* 前往日月潭 */}
                    <div className="field-group" id="field-arrival_transport">
                      <div className="field-group-title"><span className="num">03</span>前往日月潭方式 <span className="required">*</span></div>
                      <div className="opt-group">
                        {radio('arrival_transport', 'self', '8/19 自行抵達日月潭湖畔會館')}
                        {radio('arrival_transport', 'taipei_bus', '主辦專車：8/19 上午 8:30 台北車站東 3 門集合', '法工人員穿著學會背心')}
                        {form.arrival_transport === 'taipei_bus' && (
                          <div className="branch active">
                            <LocationMap label="台北車站位置示意圖（集合點：東三門全家與郵局樓梯口）"
                              src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/taipei-station.jpg"
                              onPreview={setPreviewUrl} />
                          </div>
                        )}
                        {radio('arrival_transport', 'wuri_bus', '主辦專車：8/19 上午 9:30 烏日高鐵站 6 號出口 7-8 號月台', '法工人員穿著學會背心')}
                        {form.arrival_transport === 'wuri_bus' && (
                          <div className="branch active">
                            <LocationMap label="台中高鐵站一樓 6 號出口示意圖"
                              src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/wuri-hsr.jpg"
                              onPreview={setPreviewUrl} />
                          </div>
                        )}
                        {radio('arrival_transport', 'airport_bus_0819', '主辦專車：8/19 下午 2:30 桃園機場第一航廈接機大廳右邊集合', '法工人員穿著學會背心')}
                        {form.arrival_transport === 'airport_bus_0819' && (
                          <div className="branch active">
                            <LocationMap label="桃園機場第一航廈一樓集合點示意圖"
                              src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/taoyuan-airport-t1.jpg"
                              onPreview={setPreviewUrl} />
                          </div>
                        )}
                        {radio('arrival_transport', 'self_0820', '8/20 上午 7 點前自行抵達日月潭湖畔會館')}
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

                    {/* 離開方式 */}
                    <div className="field-group" id="field-departure_transport">
                      <div className="field-group-title"><span className="num">04</span>離開日月潭湖畔會館方式 <span className="required">*</span></div>
                      <div className="opt-group">
                        {radio('departure_transport', 'self', '自行離開')}
                        {radio('departure_transport', 'bus', '乘坐主辦單位安排專車')}
                      </div>
                      {form.departure_transport === 'bus' && (
                        <div className="branch active" id="field-bus_destination">
                          <label className="form-label">專車目的地 <span className="required">*</span></label>
                          <div className="opt-group">
                            {radio('bus_destination', 'taipei_824_pm', '8/24 下午 6:00–6:30 專車到台北車站')}
                            {radio('bus_destination', 'taipei_825_am', '8/25 上午 9:00 專車到台北車站')}
                            {radio('bus_destination', 'wuri_825_am', '8/25 上午 9:00 專車到烏日高鐵')}
                            {radio('bus_destination', 'taoyuan_824_pm', '搭乘8/24 晚上的班機，請於台中高鐵站自行搭乘高鐵前往桃園機場。')}
                            {radio('bus_destination', 'taoyuan_825_am', '8/25 上午 9:00 專車到桃園機場第一航廈', '車程約 3 小時')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ============== Step 2：飲食偏好 ============== */}
                {step === 2 && (
                  <div className="step-content active">
                    <div className="step-header">
                      <p className="step-header-kicker">Step 02</p>
                      <h2 className="step-header-title">飲食偏好</h2>
                      <p className="step-header-desc">請選擇飲食類型與晚餐安排，過午不食則於 12 點前用餐。</p>
                    </div>

                    <div className="field-group">
                      <div className="field-group-title"><span className="num">01</span>飲食選擇 <span className="required">*</span></div>
                      <div id="field-diet" className="opt-group inline">
                        {radio('diet', 'meat', '葷食')}
                        {radio('diet', 'vegetarian', '素食')}
                      </div>
                    </div>

                    <div className="field-group">
                      <div className="field-group-title"><span className="num">02</span>是否過午不食 <span className="required">*</span></div>
                      <div id="field-noon_fasting" className="opt-group inline">
                        {radio('noon_fasting', 'before_noon', '是（中午12點前用餐）')}
                        {radio('noon_fasting', 'fasting_no', '否')}
                      </div>
                    </div>

                    <div className="field-group">
                      <div className="field-group-title"><span className="num">03</span>是否需要安排晚餐 <span className="required">*</span></div>
                      <div id="field-dinner_need" className="opt-group inline">
                        {radio('dinner_need', 'yes', '需要')}
                        {radio('dinner_need', 'no', '不需要')}
                      </div>
                    </div>

                    <div className="field-group">
                      <div className="field-group-title"><span className="num">04</span>茶點需求 <span className="required">*</span></div>
                      <div id="field-snacks" className="opt-group inline">
                        {radio('snacks', 'snacks_and_drink', '需要茶點、咖啡 OR 茶')}
                        {radio('snacks', 'drink_only', '只需要咖啡 OR 茶')}
                      </div>
                    </div>
                  </div>
                )}

                {/* ============== Step 3：證件上傳 ============== */}
                {step === 3 && (
                  <div className="step-content active">
                    <div className="step-header">
                      <p className="step-header-kicker">Step 03</p>
                      <h2 className="step-header-title">證件上傳</h2>
                      <p className="step-header-desc">支援 JPG / PNG / WEBP / PDF（5MB 以下）。請依您的身份類別上傳對應證件。</p>
                    </div>

                    <div className="field-group">
                      <div className="field-group-title"><span className="num">01</span>個人相片 <span className="required">*</span></div>
                      <div id="field-photo">
                        <FileField kind="photo" label="個人相片（最近 3 個月內，勿使用美顏）"
                          currentUrl={form.photo_url} uploadingKind={uploadingKind} disabled={locked}
                          onUpload={handleFileUpload} onPreview={setPreviewUrl}
                          error={errorField === 'photo'} />
                      </div>
                    </div>

                    <div className="field-group">
                      <div className="field-group-title"><span className="num">02</span>申請人身份（三選一）<span className="required">*</span></div>
                      <div className="opt-group">
                        <label className={`opt ${identityType === 'id' ? 'selected' : ''}`}>
                          <input type="radio" name="identity_type" value="id"
                            checked={identityType === 'id'}
                            onChange={() => setIdentityType('id')} disabled={locked} />
                          <span className="opt-text">
                            <strong>台灣人</strong>（上傳身分證正反面）
                          </span>
                        </label>
                        <label className={`opt ${identityType === 'passport' ? 'selected' : ''}`}>
                          <input type="radio" name="identity_type" value="passport"
                            checked={identityType === 'passport'}
                            onChange={() => setIdentityType('passport')} disabled={locked} />
                          <span className="opt-text">
                            <strong>外籍短期旅客</strong>
                            <small>觀光／免簽／短期簽證入境，上傳護照 + 填寫航班資訊</small>
                          </span>
                        </label>
                        <label className={`opt ${identityType === 'arc' ? 'selected' : ''}`}>
                          <input type="radio" name="identity_type" value="arc"
                            checked={identityType === 'arc'}
                            onChange={() => setIdentityType('arc')} disabled={locked} />
                          <span className="opt-text">
                            <strong>在台外籍居民</strong>（上傳 ARC／居留證）
                          </span>
                        </label>
                      </div>

                      {identityType === 'id' && (
                        <div className="branch active">
                          <div className="field-row">
                            <div id="field-id_front">
                              <FileField kind="id_front" label="身分證正面" required
                                currentUrl={form.id_front_url} uploadingKind={uploadingKind} disabled={locked}
                                onUpload={handleFileUpload} onPreview={setPreviewUrl}
                                error={errorField === 'id_front'} />
                            </div>
                            <div id="field-id_back">
                              <FileField kind="id_back" label="身分證反面" required
                                currentUrl={form.id_back_url} uploadingKind={uploadingKind} disabled={locked}
                                onUpload={handleFileUpload} onPreview={setPreviewUrl}
                                error={errorField === 'id_back'} />
                            </div>
                          </div>
                        </div>
                      )}
                      {identityType === 'passport' && (
                        <div className="branch active">
                          <div id="field-passport">
                            <FileField kind="passport" label="護照" required
                              currentUrl={form.passport_url} uploadingKind={uploadingKind} disabled={locked}
                              onUpload={handleFileUpload} onPreview={setPreviewUrl}
                              error={errorField === 'passport'} />
                          </div>
                        </div>
                      )}
                      {identityType === 'arc' && (
                        <div className="branch active">
                          <div id="field-arc">
                            <FileField kind="arc" label="ARC／居留證" required
                              currentUrl={form.arc_url} uploadingKind={uploadingKind} disabled={locked}
                              onUpload={handleFileUpload} onPreview={setPreviewUrl}
                              error={errorField === 'arc'} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 航班 */}
                    {identityType === 'passport' && (
                      <div className="field-group">
                        <div className="field-group-title"><span className="num">03</span>航班資訊（外籍短期旅客必填）</div>
                        <div className="field-row">
                          <div id="field-flight_arrival_date">
                            <label className="form-label">抵台航班日期（入境日）<span className="required">*</span></label>
                            <input type="date" className={`form-input ${errCls('flight_arrival_date')}`} value={form.flight_arrival_date}
                              onChange={e => update('flight_arrival_date', e.target.value)} />
                          </div>
                          <div id="field-flight_arrival_time">
                            <label className="form-label">抵台航班具體時間 <span className="required">*</span></label>
                            <input type="text" className={`form-input ${errCls('flight_arrival_time')}`} placeholder="例：14:30" value={form.flight_arrival_time}
                              onChange={e => update('flight_arrival_time', e.target.value)} />
                          </div>
                          <div id="field-flight_departure_date">
                            <label className="form-label">離台航班日期（離境日）<span className="required">*</span></label>
                            <input type="date" className={`form-input ${errCls('flight_departure_date')}`} value={form.flight_departure_date}
                              onChange={e => update('flight_departure_date', e.target.value)} />
                          </div>
                          <div id="field-flight_departure_time">
                            <label className="form-label">離台航班具體時間 <span className="required">*</span></label>
                            <input type="text" className={`form-input ${errCls('flight_departure_time')}`} placeholder="例：16:45" value={form.flight_departure_time}
                              onChange={e => update('flight_departure_time', e.target.value)} />
                          </div>
                        </div>
                        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                          <FileField kind="arrival_ticket" label="上傳來台機票（非必填）"
                            currentUrl={form.arrival_ticket_url} uploadingKind={uploadingKind} disabled={locked}
                            onUpload={handleFileUpload} onPreview={setPreviewUrl} />
                          <FileField kind="departure_ticket" label="上傳離台機票（非必填）"
                            currentUrl={form.departure_ticket_url} uploadingKind={uploadingKind} disabled={locked}
                            onUpload={handleFileUpload} onPreview={setPreviewUrl} />
                        </div>
                      </div>
                    )}

                    <div className="alert-card">
                      <div className="alert-card-title">關於快篩檢測上傳</div>
                      <p>快篩檢測時程在課程開始前後（8/17、8/19、8/20、8/22）。請完成本食宿登記後，另行於專屬頁面上傳。確認信中會附上快篩上傳頁連結。</p>
                    </div>
                  </div>
                )}

                {/* ============== Step 4：確認送出 ============== */}
                {step === 4 && (
                  <div className="step-content active">
                    <div className="step-header">
                      <p className="step-header-kicker">Step 04</p>
                      <h2 className="step-header-title">確認資料並送出</h2>
                      <p className="step-header-desc">請閱讀並同意防疫規範，確認以下資料無誤後送出。</p>
                    </div>

                    {/* 防疫與課程規範 */}
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
                          <li>開課前：8/17 上午 8:00 ～ 晚上 8:00 前上傳、8/19 上午 12:00 前上傳（於快篩頁上傳）</li>
                          <li>課程期間：8/20、8/22 上午 8:00 前<strong>現場繳交</strong>（不需線上上傳）</li>
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

                      <label id="field-agree_covid_rules" className={`consent-check ${form.agree_covid_rules ? 'selected' : ''}`}>
                        <input type="checkbox" checked={form.agree_covid_rules}
                          onChange={e => update('agree_covid_rules', e.target.checked)} disabled={locked} />
                        <span className="consent-check-txt">
                          我已閱讀並<strong>願意遵守以上防疫與課程規範</strong> <span className="required">*</span>
                        </span>
                      </label>
                    </div>

                    {/* 其他 */}
                    <div className="field-group">
                      <div className="field-group-title"><span className="num">02</span>其他</div>
                      <div className="form-label" style={{ marginBottom: 8 }}>睡覺打鼾（提供同寢室友參考）</div>
                      <div className="opt-group">
                        <label className={`opt ${!form.snoring ? 'selected' : ''}`}>
                          <input type="radio" name="snoring" checked={!form.snoring}
                            onChange={() => update('snoring', false)} disabled={locked} />
                          <span className="opt-text">睡覺不打鼾</span>
                        </label>
                        <label className={`opt ${form.snoring ? 'selected' : ''}`}>
                          <input type="radio" name="snoring" checked={!!form.snoring}
                            onChange={() => update('snoring', true)} disabled={locked} />
                          <span className="opt-text">睡覺會打鼾</span>
                        </label>
                      </div>
                    </div>

                    {/* Review */}
                    <div className="field-group">
                      <div className="field-group-title"><span className="num">03</span>資料確認</div>
                      <div className="review-grid">
                        <div className="review-group">
                          <h4>行程安排 <span className="edit-link" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>編輯 Edit</span></h4>
                          <ReviewRow k="入住日期" v={form.checkin_date || ''} />
                          <ReviewRow k="緊急聯絡人" v={`${form.emergency_name}（${form.emergency_relation}）${form.emergency_phone}`} />
                          <ReviewRow k="前往日月潭" v={TRANSPORT_LABEL[form.arrival_transport] || ''} />
                          <ReviewRow k="離開日月潭湖畔會館" v={form.departure_transport === 'self' ? '自行離開' : form.departure_transport === 'bus' ? `主辦專車（${BUS_DEST_LABEL[form.bus_destination] || '未選擇'}）` : ''} />
                        </div>

                        <div className="review-group">
                          <h4>飲食偏好 <span className="edit-link" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>編輯 Edit</span></h4>
                          <ReviewRow k="飲食" v={DIET_LABEL[form.diet] || ''} />
                          <ReviewRow k="過午不食" v={NOON_LABEL[form.noon_fasting] || ''} />
                          <ReviewRow k="安排晚餐" v={DINNER_LABEL[form.dinner_need] || ''} />
                          <ReviewRow k="茶點" v={SNACKS_LABEL[form.snacks] || ''} />
                        </div>

                        <div className="review-group">
                          <h4>證件上傳 <span className="edit-link" onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>編輯 Edit</span></h4>
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
                          <ReviewRow k="同意防疫規範" v={form.agree_covid_rules ? '✓ 已同意' : '尚未勾選'} />
                          <ReviewRow k="睡覺會打鼾" v={form.snoring ? '是' : '否'} />
                        </div>
                      </div>
                    </div>

                    <div className="alert-card">
                      <div className="alert-card-title">送出前再次提醒</div>
                      <p>送出後僅能再修改一次（共 2 次送出機會）。<strong>修改一次後即鎖定</strong>，請務必確認後再送出。</p>
                    </div>
                  </div>
                )}

              </div>
            </fieldset>

            {error && (
              <div className="alert-card" style={{ marginTop: 18, position: 'sticky', bottom: 16, zIndex: 10 }}>
                <div className="alert-card-title">{error}</div>
                <p>
                  <button onClick={() => { setError(''); setErrorField(null) }}
                    className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                    我知道了
                  </button>
                </p>
              </div>
            )}

            <div className="form-actions">
              {step > 1 ? (
                <button onClick={() => goToStep(step - 1)} className="btn btn-ghost">← 上一步</button>
              ) : (
                <a href={dashboardUrl} className="btn btn-ghost">← 返回</a>
              )}
              {step < STEPS.length ? (
                <button onClick={() => goToStep(step + 1)} className="btn btn-primary">
                  下一步 <span className="arrow">→</span>
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting || pastDeadline || locked || !!uploadingKind}
                  className="btn btn-primary">
                  {submitting
                    ? '送出中⋯'
                    : pastDeadline
                    ? '已截止'
                    : locked
                    ? '已修改過 1 次'
                    : existingLodging
                    ? '送出修改（最後 1 次）'
                    : '提交食宿登記'} <span className="arrow">→</span>
                </button>
              )}
            </div>

            {step === STEPS.length && !locked && !pastDeadline && (
              <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12.5, color: 'var(--ink-mute)' }}>
                {existingLodging
                  ? '本次為最後 1 次修改機會，送出後即鎖定。'
                  : `送出後可於 ${deadlineDay} ${deadlineTime}前再修改 1 次，系統會寄出確認信。`}
              </p>
            )}
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

            {reg.payment_plan && PLAN_INFO[reg.payment_plan] && (() => {
              const p = PLAN_INFO[reg.payment_plan]
              const statusLabel = PAYMENT_STATUS_LABEL[reg.payment_status] || reg.payment_status || '—'
              const isVerified = reg.payment_status === 'verified'
              return (
                <div className="sidebar-card" style={{ borderColor: isVerified ? 'rgba(45,106,79,0.35)' : 'rgba(180,147,88,0.3)', background: isVerified ? 'rgba(73,85,52,0.06)' : 'rgba(216,194,154,0.14)' }}>
                  <h4 style={{ color: isVerified ? 'var(--green-deep, #2d6a4f)' : 'var(--gold-deep)' }}>繳費方案 <small>Payment Plan</small></h4>
                  <div className="info-row">
                    <span className="k">方案</span>
                    <span className="v" style={{ fontWeight: 700 }}>{p.label}（{reg.payment_plan}）</span>
                  </div>
                  <div className="info-row">
                    <span className="k">日期</span>
                    <span className="v">{p.date}</span>
                  </div>
                  <div className="info-row">
                    <span className="k">繳費方式</span>
                    <span className="v">{p.method}</span>
                  </div>
                  <div className="info-row">
                    <span className="k">金額</span>
                    <span className="v" style={{ fontWeight: 600 }}>NT${p.amount.toLocaleString()}</span>
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
              <p>
                送出後僅能再修改 <strong>1 次</strong>（共 2 次送出機會），請務必確認後再送出。
              </p>
              <p style={{ marginTop: 10 }}>
                由於飯店條款限制，學會已先代墊食宿等費用，<strong>一旦繳費後取消報名，已付費用恕無法退款、轉讓</strong>。
              </p>
              <p style={{ marginTop: 10 }}>
                個人相片與證件影像務必<strong>清晰可辨</strong>，過糊將影響身份核對。
              </p>
            </div>

            <div className="sidebar-card">
              <h4>需要協助 <small>Help</small></h4>
              <p>聯絡學會：<br />
                <a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a>
              </p>
              <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, display: 'block', marginTop: 10 }} />
              <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 6, marginBottom: 0 }}>請加入學會LINE官方帳號洽詢</p>
            </div>
          </aside>
        </div>
      </main>

      {previewUrl && (
        <div className="preview-modal show" onClick={() => setPreviewUrl(null)}>
          <button className="close" onClick={() => setPreviewUrl(null)}>✕</button>
          <img src={previewUrl} alt="預覽" />
        </div>
      )}

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

function LocationMap({ label, src, onPreview }: { label: string; src: string; onPreview: (u: string) => void }) {
  return (
    <div style={{ marginTop: 4 }}>
      <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <button type="button" onClick={() => onPreview(src)}
        style={{ display: 'block', padding: 0, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-pure)', width: '100%' }}>
        <img src={src} alt={label} style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }} />
      </button>
    </div>
  )
}

function FileField({
  kind, label, required, currentUrl, uploadingKind, disabled, onUpload, onPreview, error,
}: {
  kind: string
  label: string
  required?: boolean
  currentUrl: string
  uploadingKind: string | null
  disabled?: boolean
  onUpload: (kind: string, f: File) => void
  onPreview: (u: string) => void
  error?: boolean
}) {
  const isImage = currentUrl && !currentUrl.toLowerCase().endsWith('.pdf')
  const uploading = uploadingKind === kind
  const inputId = `file-${kind}`
  const filename = currentUrl ? currentUrl.split('/').pop() || '已上傳檔案' : ''
  return (
    <div>
      <label className="form-label">
        {label}{required && <span className="required">*</span>}
      </label>

      {currentUrl && (
        <div className="uploaded-preview" style={{ marginBottom: 8 }}>
          <div className="thumb">
            {isImage ? <img src={currentUrl} alt={kind} /> : '📄'}
          </div>
          <div className="info">
            <div className="filename">{filename}</div>
            <div className="upload-time">已上傳</div>
          </div>
          <div className="actions">
            {isImage
              ? <span className="view-link" onClick={() => onPreview(currentUrl)}>檢視</span>
              : <a href={currentUrl} target="_blank" rel="noreferrer" className="view-link">開啟</a>}
          </div>
        </div>
      )}

      <label htmlFor={inputId}
        className={`upload-box ${currentUrl ? 'has-file' : ''}`}
        style={error ? { borderColor: 'var(--error)', background: 'rgba(184,82,58,0.05)' } : undefined}>
        <div className="upload-icon">{uploading ? '⏳' : currentUrl ? '✓' : '📤'}</div>
        <div className="upload-text">
          {uploading ? '上傳中⋯' : currentUrl ? '點此重新上傳' : '點此選擇檔案'}
        </div>
        <div className="upload-hint">JPG / PNG / WEBP / PDF（5MB 以下）</div>
        <input id={inputId} type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={uploading || disabled}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(kind, f) }} />
      </label>
    </div>
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

export default function LodgingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner-large" />
      </div>
    }>
      <LodgingContent />
    </Suspense>
  )
}
