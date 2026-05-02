'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SITE_ASSETS } from '@/lib/site-assets'

const THAILAND_COURSES = [
  '第一屆泰國四念處課程（2014年）',
  '第二屆泰國四念處課程（2014年）',
  '第三屆泰國四念處課程（2014年）',
  '第四屆泰國四念處課程（2015年）',
  '第五屆泰國四念處課程（2015年）',
  '第六屆泰國四念處課程（2016年）',
  '第七屆泰國四念處課程（2017年）',
  '第八屆泰國四念處課程（2017年）',
  '第九屆泰國四念處課程（2018年）',
  '第十屆泰國四念處課程（2018年）',
  '第十一屆泰國四念處課程（2019年）',
  '第十二屆泰國四念處課程（2019年）',
  '第十三屆泰國四念處課程（2024年）',
  '第十四屆泰國四念處課程（2025年）',
  '第十五屆泰國四念處課程（2025年）',
]
const MALAYSIA_COURSES = [
  '第一屆大馬四念處課程（2023年）',
  '第二屆大馬四念處課程（2024年）',
  '第三屆大馬四念處課程（2025年）',
  '第四屆大馬四念處課程（2026年）',
]
const TAIWAN_COURSES = ['第一屆台灣四念處課程（2024年）']
const SINGAPORE_COURSES = ['第一屆新加坡四念處課程（2024年）']
const ONLINE_COURSES = [
  '第一屆遠程四念處課程（2021年）',
  '第二屆遠程四念處課程（2021年）',
  '第三屆遠程四念處課程（2022年）',
  '第四屆遠程四念處課程（2022年）',
  '第五屆遠程四念處課程（2022年）',
  '第六屆遠程四念處課程（2023年）',
  '第七屆遠程四念處課程（2023年）',
  '第八屆遠程四念處課程（2024年）',
  '第九屆遠程四念處課程（2024年）',
  '第十屆遠程四念處課程（2025年，即第三屆大馬線上）',
  '第十一屆遠程四念處課程（2025年，即第十五屆泰國線上）',
  '第十二屆遠程四念處課程（2026年）',
  '第十三屆遠程四念處課程（2026年，即第四屆大馬線上）',
]
const CHENGDU_COURSES = ['《解苦心鑰》讀者交流會（2024年）']

const COURSE_GROUPS = [
  { no: 4, title: '泰國四念處禪修課程', loc: '泰國・線下實體', courses: THAILAND_COURSES },
  { no: 5, title: '馬來西亞四念處禪修課程', loc: '馬來西亞・線下實體', courses: MALAYSIA_COURSES },
  { no: 6, title: '《解苦心鑰》讀者交流會', loc: '中國成都・線下實體', courses: CHENGDU_COURSES },
  { no: 7, title: '台灣四念處禪修課程', loc: '台灣・線下實體', courses: TAIWAN_COURSES },
  { no: 8, title: '新加坡四念處禪修課程', loc: '新加坡・線下實體', courses: SINGAPORE_COURSES },
  { no: 9, title: '遠程（線上）四念處禪修課程', loc: 'Zoom・線上網路', courses: ONLINE_COURSES },
]

const STEPS = [
  { num: 1, label: '師資團隊', en: 'Teachers' },
  { num: 2, label: '課程資訊', en: 'Course Info' },
  { num: 3, label: '報名資格', en: 'Eligibility' },
  { num: 4, label: '修學背景', en: 'Background' },
  { num: 5, label: '個人資訊', en: 'Personal' },
  { num: 6, label: '確認送出', en: 'Review' },
]

const RESIDENCE_OPTIONS = ['台灣','中國大陸/內地','香港','澳門','馬來西亞','泰國','日本','美國','加拿大','新加坡','英國','斯里蘭卡','其他地區']
const PRACTICE_YEARS_OPTIONS = ['1月-3個月','3月-6個月','6月-1年','1年-2年','2年-3年','3年-4年','4年-5年','5年-8年','8年-10年','10年以上']
const PRACTICE_FREQ_LABEL: Record<string, string> = {
  every_day: '每天做固定形式的練習至少 30 分鐘',
  almost_every_day: '幾乎每天都做固定形式的練習至少 30 分鐘，偶有間斷（三個月間斷不多於5天）',
  commit_from_now: '未曾持續練習，但承諾自即日起每日練習 30 分鐘至 1 小時，持續至課程結束',
}

// 截止：2026/05/25 晚上 24:00（台北時間）= UTC 5/25 16:00
const REG_CLOSE_MS = Date.UTC(2026, 4, 25, 16, 0, 0)

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 截止日檢查
  const now = Date.now()
  const notYetOpen = false
  const pastDeadline = now > REG_CLOSE_MS
  const outOfPeriod = pastDeadline

  const [form, setForm] = useState({
    honest_confirm: '',
    attended_formal: '',
    watched_recordings: '',
    zoom_guidance: '',
    watched_30_talks: '',
    keep_precepts: '',
    practice_years: '',
    practice_frequency: '',
    pay_confirm: '',
    health_confirm: '',
    mental_health_note: 'no',
    retreat_format: '',
    chinese_name: '',
    passport_name: '',
    identity: '',
    dharma_name: '',
    gender: '',
    age: '',
    passport_country: '',
    residence: '',
    phone: '',
    email: '',
    line_id: '',
    wechat_id: '',
    line_qr_url: '',
    wechat_qr_url: '',
    contact_app: '',
    attended_courses: [] as string[],
  })

  const [errorField, setErrorField] = useState<string | null>(null)
  const update = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errorField === field) setErrorField(null)
    if (error) setError('')
  }
  const fail = (field: string, msg: string) => {
    setError(msg)
    setErrorField(field)
    // 跨 step validate 時要等 setStep 後 React re-render 完，欄位才存在 DOM
    setTimeout(() => {
      document.getElementById(`field-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return false
  }
  const errCls = (f: string) => errorField === f ? 'error' : ''

  const toggleCourse = (course: string) => {
    setForm(prev => ({
      ...prev,
      attended_courses: prev.attended_courses.includes(course)
        ? prev.attended_courses.filter(c => c !== course)
        : [...prev.attended_courses, course],
    }))
  }

  // 課程類別摺疊狀態（標題的 checkbox 控制；勾→展開、取消→收合並清空該類別）
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const toggleCourseGroup = (groupNo: number, courses: readonly string[]) => {
    const wasOpen = expandedGroups[groupNo]
    setExpandedGroups(prev => ({ ...prev, [groupNo]: !wasOpen }))
    if (wasOpen) {
      // 收合 → 清空該類別已選的所有課程
      setForm(prev => ({
        ...prev,
        attended_courses: prev.attended_courses.filter(c => !courses.includes(c)),
      }))
    }
  }

  const [uploadingQr, setUploadingQr] = useState<'line' | 'wechat' | null>(null)
  const handleQrUpload = async (kind: 'line' | 'wechat', file: File) => {
    setUploadingQr(kind)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/upload-qr', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      update(kind === 'line' ? 'line_qr_url' : 'wechat_qr_url', data.url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploadingQr(null)
    }
  }

  // 各步驟的驗證；回 true 表示通過
  const validateStep3 = (): boolean => {
    if (form.honest_confirm !== 'yes') return fail('honest_confirm', 'Q2：請承諾如實填寫本次報名表單')

    const heardDharma =
      form.attended_formal === 'yes' ||
      form.watched_recordings === 'yes' ||
      form.zoom_guidance === 'yes' ||
      form.watched_30_talks === 'yes'
    if (!form.attended_formal) return fail('attended_formal', '請回答 Q3：是否以正式學員身份參加過課程')
    if (!form.watched_recordings) return fail('watched_recordings', '請回答 Q10：是否完整觀看／聆聽過 3 屆錄影')
    if (!form.zoom_guidance) return fail('zoom_guidance', '請回答 Q11：是否透過 ZOOM 做過一對一指導')
    if (!form.watched_30_talks) return fail('watched_30_talks', '請回答 Q12：是否聽過法談 30 篇以上')
    if (!heardDharma) return fail('attended_formal', '聞法條件未達成：Q3、Q10、Q11、Q12 需至少一項選「是」')

    if (!form.keep_precepts) return fail('keep_precepts', '請回答 Q13：是否持守五戒')
    if (form.keep_precepts !== 'yes') return fail('keep_precepts', '報名條件：需持守五戒（Q13 須選「是」）')

    if (!form.practice_years) return fail('practice_years', '請回答 Q14：學習實踐多久')
    if (!form.practice_frequency) return fail('practice_frequency', '請回答 Q15：固定練習頻率')

    if (form.retreat_format !== 'online') {
      if (!form.pay_confirm) return fail('pay_confirm', '請回答 Q16：是否願意按時繳費')
      if (form.pay_confirm !== 'yes') return fail('pay_confirm', '需同意於 6/15 前完成繳費（Q16 須選「是」）')

      if (!form.health_confirm) return fail('health_confirm', '請回答 Q17：是否身體健康能全程參與')
      if (form.health_confirm !== 'yes') return fail('health_confirm', '需確認身體健康能全程參與（Q17 須選「是」）')
    }
    if (!form.retreat_format) return fail('retreat_format', '請選擇 Q1：禪修形式（實體或線上）')
    return true
  }

  const validateStep4 = (): boolean => {
    if (!form.chinese_name.trim()) return fail('chinese_name', '請填寫 Q19：中文姓名')
    if (!form.passport_name.trim()) return fail('passport_name', '請填寫 Q20：護照英文姓名')
    if (!form.identity) return fail('identity', '請選擇 Q21：身份類別（在家人／僧眾）')
    if (!form.gender) return fail('gender', '請選擇 Q23：性別')
    if (!form.age) return fail('age', '請填寫 Q24：年齡')
    if (!form.residence) return fail('residence', '請選擇 Q26：居住地')
    if (form.residence === '其他地區') return fail('residence', 'Q26：選了「其他地區」請填寫實際居住地')
    if (!form.phone.trim()) return fail('phone', '請填寫 Q27：手機號碼')
    if (!form.email.trim()) return fail('email', '請填寫 Q28：電子信箱')
    if (!form.contact_app) return fail('contact_app', '請選擇 Q29：通訊軟體（LINE 或 微信擇一）')
    if (form.contact_app === 'line') {
      if (!form.line_id.trim()) return fail('contact_app', '請填寫 LINE ID')
      if (!form.line_qr_url) return fail('contact_app', '請上傳 LINE QR Code 圖片')
    } else if (form.contact_app === 'wechat') {
      if (!form.wechat_id.trim()) return fail('contact_app', '請填寫 微信號')
      if (!form.wechat_qr_url) return fail('contact_app', '請上傳 微信 QR Code 圖片')
    }
    return true
  }

  const validateStep = (n: number): boolean => {
    if (n === 4) return validateStep3()
    if (n === 5) return validateStep4()
    return true // step 1, 2, 3, 6 純資訊不卡 validation
  }

  const goToStep = (target: number) => {
    if (target === step) return
    // 往回：自由
    if (target < step) {
      setStep(target)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // 往前：逐步驗證每一個經過的 step
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
    setError('')
    if (!validateStep3()) { setStep(4); return }
    if (!validateStep4()) { setStep(5); return }

    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          honest_confirm: form.honest_confirm === 'yes',
          attended_formal: form.attended_formal === 'yes',
          watched_recordings: form.watched_recordings === 'yes',
          zoom_guidance: form.zoom_guidance === 'yes',
          watched_30_talks: form.watched_30_talks === 'yes',
          keep_precepts: form.keep_precepts === 'yes',
          pay_confirm: form.pay_confirm === 'yes',
          health_confirm: form.health_confirm === 'yes',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/register/success')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper：是非選擇下拉
  const yesNoSelect = (field: string, label: string) => (
    <div id={`field-${field}`} className="question-block">
      <label className="form-label">{label} <span className="required">*</span></label>
      <select className={`form-select ${errCls(field)}`} value={(form as any)[field]}
        onChange={e => update(field, e.target.value)}>
        <option value="">請選擇</option>
        <option value="yes">是</option>
        <option value="no">否</option>
      </select>
    </div>
  )

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
          <a href="/" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
          </a>
          <a href="/" className="nav-back">← 返回首頁</a>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Registration Form</p>
          <h1 className="page-title">第二屆台灣四念處禪修・課程報名</h1>
          <p className="page-subtitle">
            報名期間：2026/05/11 上午 10:00 — 2026/05/25 晚上 24:00（台北時間）<br />
            提交報名表單不代表已錄取，錄取結果將於 6/6 以 Email 通知。
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

      <main className="container" style={{ paddingBottom: 60 }}>
        {outOfPeriod && (
          <div className="card with-line" style={{ textAlign: 'center', padding: '60px 40px', maxWidth: 560, margin: '40px auto' }}>
            <div style={{
              width: 64, height: 64,
              borderRadius: '50%',
              background: 'rgba(216, 194, 154, 0.3)',
              color: 'var(--gold-deep)',
              fontSize: 28,
              display: 'grid', placeItems: 'center',
              margin: '0 auto 18px',
            }}>{notYetOpen ? '⏳' : '🔒'}</div>
            <h2 style={{
              fontFamily: 'var(--font-noto-serif-tc), serif',
              fontSize: 22, fontWeight: 700,
              color: 'var(--ink)', letterSpacing: '0.08em',
              marginBottom: 12,
            }}>{notYetOpen ? '報名尚未開放' : '報名已截止'}</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.85 }}>
              {notYetOpen
                ? <>報名將於 <strong>2026/05/11 上午 10 點（台北時間）</strong>開放。<br />感謝您的關注，請屆時再回到本頁。</>
                : <>報名期間已於 <strong>2026/05/25 晚上 24 點（台北時間）</strong>截止。<br />如有疑問請<a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'var(--green)', fontWeight: 600 }}>聯繫學會</a>。</>}
            </p>
            <div style={{ marginTop: 22 }}>
              <a href="/" className="btn btn-ghost">← 返回首頁</a>
            </div>
          </div>
        )}

        {!outOfPeriod && (
        <div className="layout">
        <div>
        <div className="form-card">

          {/* ============== Step 1：師資團隊 ============== */}
          {step === 1 && (
            <div className="step-content active">
              <div className="step-header">
                <p className="step-header-kicker">Step 01</p>
                <h2 className="step-header-title">師資團隊</h2>
                <p className="step-header-desc">本次禪修由隆波帕默尊者體系助教老師親臨授課指導。</p>
              </div>

              <div className="info-section">
                <h3>唯一路</h3>
                <p>離苦的唯一路，<br />即是毗缽舍那（Vipassanā）的修行。<br />修習四念處，<br />本身就是通往覺醒之道。</p>
                <p>承蒙 隆波帕默尊者 體系助教老師指導，<br />於水月之間，共修四念處覺醒之道。<br />本次禪修將於 2026 年 8 月 20 日至 8 月 24 日，<br />於南投日月潭湖畔會館展開，為期五日四夜。</p>
                <p>誠摯邀請您，走入日月潭的山水之間，<br />在助教老師引領下，親自踏上四念處的覺醒之路。<br />修行，從此時此刻的「看見」開始。</p>
                <h4>【師資團隊】</h4>
                <p>隆波帕默尊者體系助教老師 親臨授課指導</p>
                <h4>【泰國連線授課】</h4>
                <ul>
                  <li>隆波帕默尊者 Luangpu Pramote Pamojjo</li>
                  <li>阿姜給尊者 Phra Ajahn Krit</li>
                  <li>阿姜宋彩尊者 Phra Ajahn Somchai Kittiyano</li>
                  <li>麥琪媽媽 Ajahn Khun Mae Oranuch Santayakorn</li>
                </ul>
                <h4>【親臨授課】</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginTop: 8 }}>
                  <div>阿姜納<br /><small>Ajahn Nat Sriwachirawat</small></div>
                  <div>阿姜巴山<br /><small>Ajahn Prasan Bhuddhakulsomsiri</small></div>
                  <div>阿姜妮<br /><small>Ajahn Nitiya Petchpaiboon</small></div>
                  <div>阿姜松<br /><small>Ajahn Napatpol Kunatanasate</small></div>
                </div>
              </div>
            </div>
          )}

          {/* ============== Step 2：課程資訊 ============== */}
          {step === 2 && (
            <div className="step-content active">
              <div className="step-header">
                <p className="step-header-kicker">Step 02</p>
                <h2 className="step-header-title">課程資訊</h2>
                <p className="step-header-desc">請仔細閱讀課程基本資訊，確認後進入下一步。</p>
              </div>

              <div className="info-section">
                <h3>課程資訊</h3>
                <div className="meta-row"><span className="k">課程時間</span><span className="v">2026/08/20 ～ 08/24（共 5 天）</span></div>
                <div className="meta-row"><span className="k">課程方式</span><span className="v">實體禪修</span></div>
                <div className="meta-row"><span className="k">課程地點</span><span className="v">南投日月潭湖畔會館</span></div>
                <div className="meta-row"><span className="k">課程名額</span><span className="v">250 名（額滿為止）</span></div>
                <div className="meta-row"><span className="k">課程費用</span><span className="v">課程免費，食宿、場地及交通等費用自理</span></div>
              </div>
            </div>
          )}

          {/* ============== Step 3：報名資格 ============== */}
          {step === 3 && (
            <div className="step-content active">
              <div className="step-header">
                <p className="step-header-kicker">Step 03</p>
                <h2 className="step-header-title">報名資格</h2>
                <p className="step-header-desc">請確認您符合以下資格後再進入下一步。</p>
              </div>

              <div className="info-section">
                <h3>報名條件（須<strong>同時</strong>滿足三條件）</h3>
                <h4>1. 聞法條件（任一即可）</h4>
                <ul>
                  <li>曾參加過任一屆隆波帕默尊者體系的線下實體或線上網路課程</li>
                  <li>參加過每月 ZOOM 指導老師線上互動</li>
                  <li>完整觀看／聆聽過 3 屆泰國禪修之旅課程錄影／錄音</li>
                  <li>觀看／聆聽隆波帕默尊者法談開示 30 篇以上</li>
                </ul>
                <h4>2. 持守五戒</h4>
                <h4>3. 堅持做固定形式的練習（如：經行、靜坐⋯）</h4>
              </div>

              <div className="info-section">
                <h3>錄取流程</h3>
                <p>1. 提交報名表後，將於 <strong>6 月 6 日</strong>以 Email 發送錄取通知（提交報名表單不代表已錄取）。</p>
                <p>2. 收到錄取通知後，須於 <strong>6月15日（台北時間）晚上 8 時前</strong>完成繳費並至學員專區填寫繳費資料，才算正式錄取。</p>
                <p>3. 正式錄取者，將建立 LINE 及微信群組。</p>
                <p>4. 實體禪修場地條件有限，最終錄取結果由課程組決定。</p>
              </div>
            </div>
          )}

          {/* ============== Step 4：修學背景與承諾 ============== */}
          {step === 4 && (
            <div className="step-content active">
              <div className="step-header">
                <p className="step-header-kicker">Step 04</p>
                <h2 className="step-header-title">修學背景與承諾</h2>
                <p className="step-header-desc">請依實際情況回答下列題目。本步驟所有 *標示者為必填。</p>
              </div>

              {/* Q1 */}
              <div className="question-block" id="field-retreat_format">
                <label className="form-label">1. 請選擇參加的禪修形式 <span className="required">*</span></label>
                <div className="opt-group">
                  <label className={`opt ${form.retreat_format === 'in_person' ? 'selected' : ''}`}>
                    <input type="radio" name="retreat_format" value="in_person"
                      checked={form.retreat_format === 'in_person'}
                      onChange={() => update('retreat_format', 'in_person')} />
                    <span className="opt-text">參加實體禪修課程</span>
                  </label>
                  <label className={`opt ${form.retreat_format === 'online' ? 'selected' : ''}`}>
                    <input type="radio" name="retreat_format" value="online"
                      checked={form.retreat_format === 'online'}
                      onChange={() => update('retreat_format', 'online')} />
                    <span className="opt-text">參加線上禪修課程（Zoom）</span>
                  </label>
                </div>
                {errorField === 'retreat_format' && <p className="field-error">請選擇禪修形式</p>}
              </div>

              {/* Q2 */}
              <div className="question-block" id="field-honest_confirm">
                <label className="form-label">
                  2. 您是否願意承諾如實填寫本次的報名表單？ <span className="required">*</span>
                </label>
                <select className={`form-select ${errCls('honest_confirm')}`} value={form.honest_confirm}
                  onChange={e => update('honest_confirm', e.target.value)}>
                  <option value="">請選擇</option>
                  <option value="yes">是</option>
                  <option value="no">否（將結束報名）</option>
                </select>
                {form.honest_confirm === 'no' && (
                  <p className="form-error" style={{ marginTop: 8 }}>感謝您的誠實，報名表將不予提交。</p>
                )}
              </div>

              {/* Q3 */}
              <div className="question-block" id="field-attended_formal">
                <label className="form-label">3. 您是否以正式學員身份參加過隆波帕默尊者體系所舉辦的實體或線上課程？ <span className="required">*</span></label>
                <select className={`form-select ${errCls('attended_formal')}`} value={form.attended_formal}
                  onChange={e => update('attended_formal', e.target.value)}>
                  <option value="">請選擇</option>
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </div>

              {/* Q4-Q9 */}
              {COURSE_GROUPS.map(({ no, title, loc, courses }) => {
                const open = !!expandedGroups[no]
                const selectedCount = courses.filter(c => form.attended_courses.includes(c)).length
                return (
                  <div key={title} className="question-block">
                    <label className={`opt ${open ? 'selected' : ''}`} style={{ marginBottom: 0 }}>
                      <input type="checkbox" checked={open}
                        onChange={() => toggleCourseGroup(no, courses)} />
                      <span className="opt-text">
                        <strong>{no}. {title}</strong>
                        <small>{loc}・非必選{selectedCount > 0 && open ? `（已勾 ${selectedCount} 屆）` : ''}</small>
                      </span>
                    </label>
                    {open && (
                      <div className="branch-reveal active" style={{ marginTop: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                          {courses.map(course => (
                            <label key={course} className={`opt ${form.attended_courses.includes(course) ? 'selected' : ''}`}>
                              <input type="checkbox" checked={form.attended_courses.includes(course)}
                                onChange={() => toggleCourse(course)} />
                              <span className="opt-text" style={{ fontSize: 13 }}>{course}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {yesNoSelect('watched_recordings', '10. 您是否完整地觀看／聆聽過至少 3 屆泰國四念處之旅的錄影／錄音？')}
              {yesNoSelect('zoom_guidance', '11. 您是否透過ZOOM的方式，獲得阿姜巴山、阿姜納、阿姜松、阿姜妮或阿姜沃伊做一對一的禪修指導？')}
              {yesNoSelect('watched_30_talks', '12. 您是否觀看／聆聽過隆波帕默尊者法談開示 30 篇以上？')}
              {yesNoSelect('keep_precepts', '13. 您是否持守五戒？')}

              <div className="question-block" id="field-practice_years">
                <label className="form-label">14. 您學習並實踐隆波帕默尊者的教導多久了？ <span className="required">*</span></label>
                <select className={`form-select ${errCls('practice_years')}`} value={form.practice_years}
                  onChange={e => update('practice_years', e.target.value)}>
                  <option value="">請選擇</option>
                  {PRACTICE_YEARS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="question-block" id="field-practice_frequency">
                <label className="form-label">15. 在過去的三個月內，您做固定式練習的頻率是： <span className="required">*</span></label>
                <select className={`form-select ${errCls('practice_frequency')}`} value={form.practice_frequency}
                  onChange={e => update('practice_frequency', e.target.value)}>
                  <option value="">請選擇</option>
                  <option value="every_day">每天做固定形式的練習至少 30 分鐘</option>
                  <option value="almost_every_day">幾乎每天都做固定形式的練習至少 30 分鐘，偶有間斷（三個月間斷不多於5天）</option>
                  <option value="commit_from_now">未曾持續練習，但承諾自即日起每日練習 30 分鐘至 1 小時，持續至課程結束</option>
                </select>
              </div>

              {form.retreat_format !== 'online' && (
                <>
                  <div className="question-block" id="field-pay_confirm">
                    <label className="form-label">16. 實體禪修課程之食宿、場地及交通等費用需由學員自行負擔，並請於 6 月 15 日前完成匯款或刷卡支付。請問您是否可於期限內完成付款？ <span className="required">*</span></label>
                    <select className={`form-select ${errCls('pay_confirm')}`} value={form.pay_confirm}
                      onChange={e => update('pay_confirm', e.target.value)}>
                      <option value="">請選擇</option>
                      <option value="yes">是，我願意按時全額支付</option>
                      <option value="no">否，我不願意支付</option>
                    </select>
                  </div>

                  {yesNoSelect('health_confirm', '17. 您是否身體健康，能夠全程獨立參與實體禪修課程？')}

                  <div className="question-block">
                    <label className="form-label">18. 您是否有心理或精神疾病史？ <span className="required">*</span></label>
                    <div className="opt-group">
                      <label className={`opt ${form.mental_health_note === 'no' ? 'selected' : ''}`}>
                        <input type="radio" name="mental_health" value="no"
                          checked={form.mental_health_note === 'no'}
                          onChange={() => update('mental_health_note', 'no')} />
                        <span className="opt-text">否，無心理或精神疾病史</span>
                      </label>
                      <label className={`opt ${form.mental_health_note.startsWith('yes') ? 'selected' : ''}`}>
                        <input type="radio" name="mental_health" value="yes"
                          checked={form.mental_health_note.startsWith('yes')}
                          onChange={() => update('mental_health_note', 'yes:')} />
                        <span className="opt-text">是，請詳細說明</span>
                      </label>
                    </div>
                    {form.mental_health_note.startsWith('yes') && (
                      <div className="branch-reveal active" style={{ marginTop: 10 }}>
                        <textarea className="form-textarea" rows={3} placeholder="請詳細說明您的狀況"
                          value={form.mental_health_note.replace('yes:', '')}
                          onChange={e => update('mental_health_note', 'yes:' + e.target.value)} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============== Step 5：個人資訊 ============== */}
          {step === 5 && (
            <div className="step-content active">
              <div className="step-header">
                <p className="step-header-kicker">Step 05</p>
                <h2 className="step-header-title">個人資訊</h2>
                <p className="step-header-desc">提供報名所需的聯絡與身份資料。所有資料僅供本次禪修使用。</p>
              </div>

              <div className="field-row">
                <div id="field-chinese_name">
                  <label className="form-label">19. 中文姓名（身分證／護照姓名）<span className="required">*</span></label>
                  <input className={`form-input ${errCls('chinese_name')}`} value={form.chinese_name}
                    onChange={e => update('chinese_name', e.target.value)} />
                </div>
                <div id="field-passport_name">
                  <label className="form-label">20. 護照英文姓名 <span className="required">*</span></label>
                  <input className={`form-input ${errCls('passport_name')}`} value={form.passport_name}
                    onChange={e => update('passport_name', e.target.value)} />
                </div>
              </div>

              <div id="field-identity" style={{ marginTop: 14 }}>
                <label className="form-label">21. 請問您屬於： <span className="required">*</span></label>
                <div className="opt-group inline">
                  {[['lay', '在家人（居士）'], ['monastic', '僧眾']].map(([val, label]) => (
                    <label key={val} className={`opt ${form.identity === val ? 'selected' : ''}`}>
                      <input type="radio" name="identity" value={val}
                        checked={form.identity === val}
                        onChange={e => update('identity', e.target.value)} />
                      <span className="opt-text">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.identity === 'monastic' && (
                <div className="branch-reveal active" style={{ marginTop: 12 }}>
                  <label className="form-label">22. 法名（僅出家師父填寫）</label>
                  <input className="form-input" value={form.dharma_name}
                    onChange={e => update('dharma_name', e.target.value)} />
                </div>
              )}

              <div className="field-row" style={{ marginTop: 14 }}>
                <div id="field-gender">
                  <label className="form-label">23. 性別 <span className="required">*</span></label>
                  <div className="opt-group inline">
                    {[['male', '男'], ['female', '女']].map(([val, label]) => (
                      <label key={val} className={`opt ${form.gender === val ? 'selected' : ''}`}>
                        <input type="radio" name="gender" value={val}
                          checked={form.gender === val}
                          onChange={e => update('gender', e.target.value)} />
                        <span className="opt-text">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div id="field-age">
                  <label className="form-label">24. 年齡 <span className="required">*</span></label>
                  <input type="number" className={`form-input ${errCls('age')}`} value={form.age}
                    onChange={e => update('age', e.target.value)} />
                </div>
              </div>

              <div className="field-row" style={{ marginTop: 14 }}>
                <div>
                  <label className="form-label">25. 護照頒發地</label>
                  {(() => {
                    const isOther = form.passport_country === '其他地區' || form.passport_country.startsWith('其他地區：')
                    const otherText = form.passport_country.startsWith('其他地區：')
                      ? form.passport_country.slice('其他地區：'.length)
                      : ''
                    return (
                      <>
                        <select className="form-select"
                          value={isOther ? '其他地區' : form.passport_country}
                          onChange={e => update('passport_country', e.target.value)}>
                          <option value="">請選擇（非必填）</option>
                          {RESIDENCE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        {isOther && (
                          <input className="form-input"
                            style={{ marginTop: 8 }}
                            placeholder="請填寫護照頒發地"
                            value={otherText}
                            onChange={e => {
                              const t = e.target.value
                              update('passport_country', t ? `其他地區：${t}` : '其他地區')
                            }} />
                        )}
                      </>
                    )
                  })()}
                </div>
                <div id="field-residence">
                  <label className="form-label">26. 居住地 <span className="required">*</span></label>
                  {(() => {
                    const isOther = form.residence === '其他地區' || form.residence.startsWith('其他地區：')
                    const otherText = form.residence.startsWith('其他地區：')
                      ? form.residence.slice('其他地區：'.length)
                      : ''
                    return (
                      <>
                        <select className={`form-select ${errCls('residence')}`}
                          value={isOther ? '其他地區' : form.residence}
                          onChange={e => update('residence', e.target.value)}>
                          <option value="">請選擇</option>
                          {RESIDENCE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        {isOther && (
                          <input className={`form-input ${errCls('residence')}`}
                            style={{ marginTop: 8 }}
                            placeholder="請填寫居住地（例：日本沖繩、加拿大溫哥華）"
                            value={otherText}
                            onChange={e => {
                              const t = e.target.value
                              update('residence', t ? `其他地區：${t}` : '其他地區')
                            }} />
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="field-row" style={{ marginTop: 14 }}>
                <div id="field-phone">
                  <label className="form-label">27. 手機號碼 <span className="required">*</span><span className="form-hint" style={{ display: 'inline', marginLeft: 6 }}>海外請加國際碼，例：886+</span></label>
                  <input className={`form-input ${errCls('phone')}`} value={form.phone}
                    onChange={e => update('phone', e.target.value)} />
                </div>
                <div id="field-email">
                  <label className="form-label">28. 電子信箱 <span className="required">*</span></label>
                  <input type="email" className={`form-input ${errCls('email')}`} value={form.email}
                    onChange={e => update('email', e.target.value)} />
                </div>
              </div>

              <div id="field-contact_app" style={{ marginTop: 18 }}>
                <label className="form-label">29. 通訊軟體 <span className="required">*</span></label>
                <p className="form-hint" style={{ marginBottom: 10 }}>必填，請於 LINE 或 微信擇一填寫並上傳對應 QR Code（檔案上限 500KB）</p>
                <div className="opt-group inline">
                  <label className={`opt ${form.contact_app === 'line' ? 'selected' : ''}`}>
                    <input type="radio" name="contact_app" value="line"
                      checked={form.contact_app === 'line'}
                      onChange={() => update('contact_app', 'line')} />
                    <span className="opt-text">LINE</span>
                  </label>
                  <label className={`opt ${form.contact_app === 'wechat' ? 'selected' : ''}`}>
                    <input type="radio" name="contact_app" value="wechat"
                      checked={form.contact_app === 'wechat'}
                      onChange={() => update('contact_app', 'wechat')} />
                    <span className="opt-text">微信（WeChat）</span>
                  </label>
                </div>

                {form.contact_app === 'line' && (
                  <div className="branch-reveal active" style={{ marginTop: 12 }}>
                    <label className="form-label">LINE ID <span className="required">*</span></label>
                    <input className="form-input" placeholder="請填寫 LINE ID" value={form.line_id}
                      onChange={e => update('line_id', e.target.value)} />
                    <div style={{ marginTop: 12 }}>
                      <label className="form-label">LINE QR Code 圖片 <span className="required">*</span></label>
                      {form.line_qr_url && (
                        <div className="uploaded-preview" style={{ marginBottom: 8 }}>
                          <div className="thumb"><img src={form.line_qr_url} alt="LINE QR" /></div>
                          <div className="info">
                            <div className="filename">已上傳 LINE QR</div>
                          </div>
                        </div>
                      )}
                      <label htmlFor="qr-line" className={`upload-box ${form.line_qr_url ? 'has-file' : ''}`}>
                        <div className="upload-icon">{uploadingQr === 'line' ? '⏳' : form.line_qr_url ? '✓' : '📤'}</div>
                        <div className="upload-text">
                          {uploadingQr === 'line' ? '上傳中⋯' : form.line_qr_url ? '點此重新上傳 LINE QR' : '點此選擇 LINE QR Code'}
                        </div>
                        <div className="upload-hint">JPG / PNG / WEBP（500KB 以下）</div>
                        <input id="qr-line" type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingQr === 'line'}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload('line', f) }} />
                      </label>
                    </div>
                  </div>
                )}

                {form.contact_app === 'wechat' && (
                  <div className="branch-reveal active" style={{ marginTop: 12 }}>
                    <label className="form-label">微信號 <span className="required">*</span></label>
                    <input className="form-input" placeholder="請填寫微信號" value={form.wechat_id}
                      onChange={e => update('wechat_id', e.target.value)} />
                    <div style={{ marginTop: 12 }}>
                      <label className="form-label">微信二維碼圖片 <span className="required">*</span></label>
                      {form.wechat_qr_url && (
                        <div className="uploaded-preview" style={{ marginBottom: 8 }}>
                          <div className="thumb"><img src={form.wechat_qr_url} alt="WeChat QR" /></div>
                          <div className="info">
                            <div className="filename">已上傳 WeChat QR</div>
                          </div>
                        </div>
                      )}
                      <label htmlFor="qr-wechat" className={`upload-box ${form.wechat_qr_url ? 'has-file' : ''}`}>
                        <div className="upload-icon">{uploadingQr === 'wechat' ? '⏳' : form.wechat_qr_url ? '✓' : '📤'}</div>
                        <div className="upload-text">
                          {uploadingQr === 'wechat' ? '上傳中⋯' : form.wechat_qr_url ? '點此重新上傳 微信 QR' : '點此選擇微信二維碼'}
                        </div>
                        <div className="upload-hint">JPG / PNG / WEBP（500KB 以下）</div>
                        <input id="qr-wechat" type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingQr === 'wechat'}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload('wechat', f) }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============== Step 6：確認送出 ============== */}
          {step === 6 && (
            <div className="step-content active">
              <div className="step-header">
                <p className="step-header-kicker">Step 06</p>
                <h2 className="step-header-title">確認資料</h2>
                <p className="step-header-desc">請最後確認以下資料，無誤後送出。送出後可在學員專區查詢狀態。</p>
              </div>

              <div className="review-grid">
                <div className="review-group">
                  <h4>修學背景與承諾 <span className="edit-link" onClick={() => { setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>編輯 Edit</span></h4>
                  <ReviewRow k="如實填寫" v={form.honest_confirm === 'yes' ? '是' : '—'} />
                  <ReviewRow k="正式學員參加課程" v={form.attended_formal === 'yes' ? '是' : form.attended_formal === 'no' ? '否' : '—'} />
                  <ReviewRow k="3 屆錄影／錄音" v={form.watched_recordings === 'yes' ? '是' : form.watched_recordings === 'no' ? '否' : '—'} />
                  <ReviewRow k="ZOOM 一對一指導" v={form.zoom_guidance === 'yes' ? '是' : form.zoom_guidance === 'no' ? '否' : '—'} />
                  <ReviewRow k="法談 30 篇以上" v={form.watched_30_talks === 'yes' ? '是' : form.watched_30_talks === 'no' ? '否' : '—'} />
                  <ReviewRow k="參加過課程" v={form.attended_courses.length > 0 ? `${form.attended_courses.length} 屆` : '—'} />
                  <ReviewRow k="持守五戒" v={form.keep_precepts === 'yes' ? '是' : form.keep_precepts === 'no' ? '否' : '—'} />
                  <ReviewRow k="學習實踐多久" v={form.practice_years || '—'} />
                  <ReviewRow k="固定練習頻率" v={PRACTICE_FREQ_LABEL[form.practice_frequency] || '—'} />
                  {form.retreat_format !== 'online' && <>
                    <ReviewRow k="可按時繳費" v={form.pay_confirm === 'yes' ? '是' : form.pay_confirm === 'no' ? '否' : '—'} />
                    <ReviewRow k="身體健康可全程參與" v={form.health_confirm === 'yes' ? '是' : form.health_confirm === 'no' ? '否' : '—'} />
                    <ReviewRow k="心理／精神疾病史" v={form.mental_health_note === 'no' ? '無' : form.mental_health_note.startsWith('yes:') ? `是：${form.mental_health_note.replace('yes:', '') || '（未填寫說明）'}` : '—'} />
                  </>}
                </div>

                <div className="review-group">
                  <h4>個人資訊 <span className="edit-link" onClick={() => { setStep(5); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>編輯 Edit</span></h4>
                  <ReviewRow k="中文姓名" v={form.chinese_name} />
                  <ReviewRow k="護照英文姓名" v={form.passport_name} />
                  <ReviewRow k="身份" v={form.identity === 'lay' ? '在家人（居士）' : form.identity === 'monastic' ? '僧眾' : '—'} />
                  {form.identity === 'monastic' && <ReviewRow k="法名" v={form.dharma_name} />}
                  <ReviewRow k="性別" v={form.gender === 'male' ? '男' : form.gender === 'female' ? '女' : '—'} />
                  <ReviewRow k="年齡" v={form.age} />
                  <ReviewRow k="護照頒發地" v={form.passport_country} />
                  <ReviewRow k="居住地" v={form.residence} />
                  <ReviewRow k="手機號碼" v={form.phone} />
                  <ReviewRow k="電子信箱" v={form.email} />
                  <ReviewRow k="通訊軟體" v={
                    form.contact_app === 'line' ? `LINE ${form.line_id}` :
                    form.contact_app === 'wechat' ? `微信 ${form.wechat_id}` : '—'
                  } />
                </div>
              </div>

              {form.retreat_format !== 'online' && (
                <div className="alert-card" style={{ marginTop: 18 }}>
                  <div className="alert-card-title">8/20–8/24 禪修期間之食宿、交通及場地費用</div>
                  <p>食宿、交通及場地費用：<strong>NT$18,600 元整</strong>（如需提前或延後住宿，將另計相關費用）</p>
                  <p>錄取後將提供繳費連結，請於 6 月 15 日前完成繳費。</p>
                </div>
              )}

              <div className="alert-card" style={{ marginTop: 12 }}>
                <div className="alert-card-title">送出前再次提醒</div>
                <p>提交報名表後並不代表已錄取，錄取結果將於 <strong>6/6</strong> 以 Email 通知。請以您填寫的 Email 為準，注意查收（含垃圾信箱）。</p>
                <p>送出後將自動寄送一封確認信至您的 Email，內含繳費專屬碼，請妥善保管。</p>
              </div>
            </div>
          )}

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
              <a href="/" className="btn btn-ghost">← 返回首頁</a>
            )}
            {step < STEPS.length ? (
              <button onClick={() => goToStep(step + 1)}
                disabled={step === 4 && form.honest_confirm === 'no'}
                className="btn btn-primary">
                下一步 <span className="arrow">→</span>
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
                {loading ? '提交中⋯' : '提交報名表'} <span className="arrow">→</span>
              </button>
            )}
          </div>

          {step === STEPS.length && (
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: 'var(--ink-mute)' }}>
              提交後系統會將報名資訊發送到您填寫的電子信箱，請注意查收（包括垃圾郵件）。
            </p>
          )}
        </div>
        </div>

        <aside>
          <div className="sidebar-card">
            <h4>禪修概要 <small>At a Glance</small></h4>
            <div className="info-row"><span className="k">日期</span><span className="v">08.20—24</span></div>
            <div className="info-row"><span className="k">地點</span><span className="v">日月潭</span></div>
            <div className="info-row"><span className="k">名額</span><span className="v">250 名</span></div>
            <div className="info-row"><span className="k">報名截止</span><span className="v" style={{ color: 'var(--gold-deep)' }}>05.25</span></div>
            <div className="info-row"><span className="k">錄取通知</span><span className="v">06.06</span></div>
            <div className="info-row"><span className="k">繳費截止</span><span className="v" style={{ color: 'var(--gold-deep)' }}>06.15</span></div>
          </div>

          <div className="sidebar-card" style={{ background: 'rgba(216, 194, 154, 0.18)', borderColor: 'rgba(180, 147, 88, 0.3)' }}>
            <h4 style={{ color: 'var(--gold-deep)' }}>※ 貼心提醒 <small>Tips</small></h4>
            <p>
              請勿在 LINE 或微信內建瀏覽器中填寫，建議使用 <strong>Chrome、Safari</strong> 等瀏覽器，避免 QR Code 上傳失敗。
            </p>
            <p style={{ marginTop: 10 }}>
              提交後系統會寄出確認信，內含您的<strong>專屬繳費碼</strong>，請妥善保管。
            </p>
          </div>

          <div className="sidebar-card">
            <h4>需要協助 <small>Need Help</small></h4>
            <p>聯絡學會：<br />
              <a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a>
            </p>
            <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, display: 'block', marginTop: 10 }} />
            <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 6, marginBottom: 0 }}>請加入學會LINE官方帳號洽詢</p>
          </div>
        </aside>
        </div>
        )}

        {!outOfPeriod && (
          <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
            <p style={{ fontFamily: 'var(--font-noto-serif-tc), serif', color: 'var(--green-deep)', fontWeight: 700 }}>
              台灣四念處學會 🙏
            </p>
            <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 4 }}>隨喜功德</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處學會　All rights reserved.</div>
          <div>
            <h5 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'rgba(251,248,242,0.9)', letterSpacing: '0.1em' }}>聯絡我們</h5>
            <div style={{ marginBottom: 12 }}><a href="mailto:satipatthana.tw@gmail.com" style={{ color: 'rgba(251,248,242,0.75)', fontSize: 13 }}>satipatthana.tw@gmail.com</a></div>
            <img src={SITE_ASSETS.lineOfficial} alt="LINE 官方帳號" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.2)' }} />
            <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>請加入學會LINE官方帳號洽詢</p>
          </div>
        </div>
      </footer>
    </>
  )
}

function ReviewRow({ k, v }: { k: string; v: string | undefined }) {
  const empty = !v || v === '—' || v.trim?.() === ''
  return (
    <div className="review-row">
      <span className="k">{k}</span>
      <span className={`v ${empty ? 'empty' : ''}`}>{empty ? '未填寫' : v}</span>
    </div>
  )
}
