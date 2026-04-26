'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  { no: 3, title: '泰國四念處禪修課程', loc: '泰國・線下實體', courses: THAILAND_COURSES },
  { no: 4, title: '馬來西亞四念處禪修課程', loc: '馬來西亞・線下實體', courses: MALAYSIA_COURSES },
  { no: 5, title: '《解苦心鑰》讀者交流會', loc: '中國成都・線下實體', courses: CHENGDU_COURSES },
  { no: 6, title: '台灣四念處禪修課程', loc: '台灣・線下實體', courses: TAIWAN_COURSES },
  { no: 7, title: '新加坡四念處禪修課程', loc: '新加坡・線下實體', courses: SINGAPORE_COURSES },
  { no: 8, title: '遠程（線上）四念處禪修課程', loc: 'Zoom・線上網路', courses: ONLINE_COURSES },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    mental_health_note: '',
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
  }
  const fail = (field: string, msg: string) => {
    setError(msg)
    setErrorField(field)
    setTimeout(() => {
      document.getElementById(`field-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
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

  const handleSubmit = async () => {
    setError('')

    if (form.honest_confirm !== 'yes') return fail('honest_confirm', 'Q1：請承諾如實填寫本次報名表單')

    const heardDharma =
      form.attended_formal === 'yes' ||
      form.watched_recordings === 'yes' ||
      form.zoom_guidance === 'yes' ||
      form.watched_30_talks === 'yes'
    if (!form.attended_formal) return fail('attended_formal', '請回答 Q2：是否以正式學員身份參加過課程')
    if (!form.watched_recordings) return fail('watched_recordings', '請回答 Q9：是否完整觀看/聆聽過 3 屆錄影')
    if (!form.zoom_guidance) return fail('zoom_guidance', '請回答 Q10：是否透過 ZOOM 做過一對一指導')
    if (!form.watched_30_talks) return fail('watched_30_talks', '請回答 Q11：是否聽過法談 30 篇以上')
    if (!heardDharma) return fail('attended_formal', '聞法條件未達成：Q2、Q9、Q10、Q11 需至少一項選「是」')

    if (!form.keep_precepts) return fail('keep_precepts', '請回答 Q12：是否持守五戒')
    if (form.keep_precepts !== 'yes') return fail('keep_precepts', '報名條件：需持守五戒（Q12 須選「是」）')

    if (!form.practice_years) return fail('practice_years', '請回答 Q13：學習實踐多久')
    if (!form.practice_frequency) return fail('practice_frequency', '請回答 Q14：固定練習頻率')

    if (!form.pay_confirm) return fail('pay_confirm', '請回答 Q15：是否願意按時繳費')
    if (form.pay_confirm !== 'yes') return fail('pay_confirm', '需同意於 6/15 前完成繳費（Q15 須選「是」）')

    if (!form.health_confirm) return fail('health_confirm', '請回答 Q16：是否身體健康能全程參與')
    if (form.health_confirm !== 'yes') return fail('health_confirm', '需確認身體健康能全程參與（Q16 須選「是」）')

    if (!form.chinese_name.trim()) return fail('chinese_name', '請填寫 Q19：中文姓名')
    if (!form.passport_name.trim()) return fail('passport_name', '請填寫 Q20：護照英文姓名')
    if (!form.identity) return fail('identity', '請選擇 Q21：身份類別（在家人／僧眾）')
    if (!form.gender) return fail('gender', '請選擇 Q23：性別')
    if (!form.age) return fail('age', '請填寫 Q24：年齡')
    if (!form.residence) return fail('residence', '請選擇 Q26：居住地')
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
    <div id={`field-${field}`} style={{ marginBottom: 16 }}>
      <label className="form-label">{label} <span className="required">*</span></label>
      <select className={`form-select ${errCls(field)}`} value={(form as any)[field]}
        onChange={e => update(field, e.target.value)}>
        <option value="">請選擇</option>
        <option value="yes">是</option>
        <option value="no">否</option>
      </select>
    </div>
  )

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
        </div>
      </div>

      <main className="container" style={{ paddingBottom: 60 }}>
        {/* 課程介紹 */}
        <div className="card with-line" style={{ marginBottom: 28 }}>
          <div className="info-section">
            <h3>課程資訊 <small style={{ marginLeft: 8, fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: 13, fontWeight: 600 }}>Course Info</small></h3>
            <div className="meta-row"><span className="k">課程時間</span><span className="v">2026/08/20 ～ 08/24（共 5 天）</span></div>
            <div className="meta-row"><span className="k">課程方式</span><span className="v">實體禪修</span></div>
            <div className="meta-row"><span className="k">課程地點</span><span className="v">南投・日月潭湖畔會館</span></div>
            <div className="meta-row"><span className="k">課程名額</span><span className="v">250 名（額滿為止）</span></div>
            <div className="meta-row"><span className="k">課程費用</span><span className="v">課程免費，食宿、場地及交通等費用自理（NT$18,600）</span></div>
          </div>

          <div className="info-section">
            <h3>傳承與指導</h3>
            <p>承蒙隆波帕默尊者慈悲指定，由助教老師團隊親自指導。</p>
            <h4>指導老師陣容</h4>
            <ul>
              <li>阿姜巴山 Ajahn Prasan Bhuddhakulsomsiri</li>
              <li>阿姜納 Ajahn Nat Sriwachirawat</li>
              <li>阿姜妮 Ajahn Nitiya Petchpaiboon</li>
              <li>阿姜松 Ajahn Napatpol Kunatanasate</li>
            </ul>
          </div>

          <div className="info-section">
            <h3>報名條件（須<strong>同時</strong>滿足三條件）</h3>
            <h4>1. 聞法條件（任一即可）</h4>
            <ul>
              <li>曾參加過任意一屆隆波帕默尊者體系的線下實體或線上網路課程</li>
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
            <p>2. 收到錄取通知後，須於 <strong>6 月 15 日台北時間晚上 8 時前</strong>完成繳費並至學員專區填寫繳費資料，才算正式錄取。</p>
            <p>3. 正式錄取者，將建立 LINE 及微信群組。</p>
            <p>4. 實體禪修場地條件有限，最終錄取結果由課程組決定。</p>
          </div>
        </div>

        <div className="form-card">
          {/* Q1 */}
          <div className="question-block" id="field-honest_confirm">
            <label className="form-label">
              1. 您是否願意承諾如實填寫本次的報名表單？ <span className="required">*</span>
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

          {form.honest_confirm === 'yes' && (
            <>
              {/* Part 2: 報名條件 */}
              <div className="field-group">
                <div className="field-group-title"><span className="num">PART 02</span>報名條件確認</div>

                <div id="field-attended_formal" style={{ marginBottom: 16 }}>
                  <label className="form-label">2. 是否以正式學員身份參加過隆波帕默尊者體系的實體或線上課程？ <span className="required">*</span></label>
                  <select className={`form-select ${errCls('attended_formal')}`} value={form.attended_formal}
                    onChange={e => update('attended_formal', e.target.value)}>
                    <option value="">請選擇</option>
                    <option value="yes">是</option>
                    <option value="no">否</option>
                  </select>
                </div>

                {COURSE_GROUPS.map(({ no, title, loc, courses }) => (
                  <div key={title} style={{ marginBottom: 18 }}>
                    <label className="form-label">{no}. {title}　<span className="form-hint" style={{ display: 'inline', marginLeft: 6 }}>{loc}・非必選</span></label>
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
                ))}

                {yesNoSelect('watched_recordings', '9. 是否完整觀看／聆聽過至少 3 屆泰國四念處之旅的錄影／錄音？')}
                {yesNoSelect('zoom_guidance', '10. 您是否透過 ZOOM 的方式，獲得阿姜巴山、阿姜納、阿姜松、阿姜妮或阿姜沃伊做一對一的禪修指導？')}
                {yesNoSelect('watched_30_talks', '11. 是否觀看／聆聽過隆波帕默尊者法談開示 30 篇以上？')}
                {yesNoSelect('keep_precepts', '12. 您是否持守五戒？')}

                <div id="field-practice_years" style={{ marginBottom: 16 }}>
                  <label className="form-label">13. 您學習並實踐隆波帕默尊者的教導多久了？ <span className="required">*</span></label>
                  <select className={`form-select ${errCls('practice_years')}`} value={form.practice_years}
                    onChange={e => update('practice_years', e.target.value)}>
                    <option value="">請選擇</option>
                    {['1月-3個月','3月-6個月','6月-1年','1年-2年','2年-3年','3年-4年','4年-5年','5年-8年','8年-10年','10年以上'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div id="field-practice_frequency" style={{ marginBottom: 16 }}>
                  <label className="form-label">14. 過去三個月內，您做固定式練習的頻率是？ <span className="required">*</span></label>
                  <select className={`form-select ${errCls('practice_frequency')}`} value={form.practice_frequency}
                    onChange={e => update('practice_frequency', e.target.value)}>
                    <option value="">請選擇</option>
                    <option value="every_day">每天至少 30 分鐘</option>
                    <option value="almost_every_day">幾乎每天，偶有間斷</option>
                    <option value="commit_from_now">未曾持續練習，但承諾自即日起每日練習 30 分鐘至 1 小時，持續至課程結束</option>
                  </select>
                </div>

                <div id="field-pay_confirm" style={{ marginBottom: 16 }}>
                  <label className="form-label">15. 食宿、場地及交通等費用需由學員自行負擔，並請於 6/15 前完成支付。是否可於期限內完成？ <span className="required">*</span></label>
                  <select className={`form-select ${errCls('pay_confirm')}`} value={form.pay_confirm}
                    onChange={e => update('pay_confirm', e.target.value)}>
                    <option value="">請選擇</option>
                    <option value="yes">是，我願意按時全額支付</option>
                    <option value="no">否</option>
                  </select>
                </div>

                {yesNoSelect('health_confirm', '16. 您是否身體健康，能夠全程獨立參與？')}

                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">17. 您是否有心理或精神疾病史？ <span className="required">*</span></label>
                  <div className="opt-group">
                    <label className={`opt ${(form.mental_health_note === 'no' || form.mental_health_note === '') ? 'selected' : ''}`}>
                      <input type="radio" name="mental_health" value="no"
                        checked={form.mental_health_note === 'no' || form.mental_health_note === ''}
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
              </div>

              {/* Part 3: 個人資訊 */}
              <div className="field-group">
                <div className="field-group-title"><span className="num">PART 03</span>個人資訊</div>

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
                  <label className="form-label">21. 您屬於？ <span className="required">*</span></label>
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
                    <input className="form-input" value={form.passport_country}
                      onChange={e => update('passport_country', e.target.value)} />
                  </div>
                  <div id="field-residence">
                    <label className="form-label">26. 居住地 <span className="required">*</span></label>
                    <select className={`form-select ${errCls('residence')}`} value={form.residence}
                      onChange={e => update('residence', e.target.value)}>
                      <option value="">請選擇</option>
                      {['台灣','中國大陸/內地','香港','澳門','馬來西亞','泰國','日本','美國','加拿大','新加坡','英國','斯里蘭卡','其他地區'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
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
                  <label className="form-label">29. 通訊軟體（LINE 或 微信擇一）<span className="required">*</span></label>
                  <p className="form-hint" style={{ marginBottom: 10 }}>請擇一填寫並上傳對應 QR Code（檔案上限 500KB）</p>
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

              {/* 費用說明 */}
              <div className="alert-card" style={{ marginBottom: 28 }}>
                <div className="alert-card-title">8/20–8/24 禪修期間費用</div>
                <p>食宿、交通及場地費用：<strong>NT$18,600 元整</strong>（如需提前或延後住宿，將另計相關費用）</p>
                <p>錄取後將提供繳費連結，請於 6 月 15 日前完成繳費。</p>
              </div>

              {error && (
                <div className="alert-card" style={{ marginBottom: 18, position: 'sticky', bottom: 16, zIndex: 10 }}>
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
                <a href="/" className="btn btn-ghost">← 返回首頁</a>
                <button onClick={handleSubmit} disabled={loading}
                  className="btn btn-primary">
                  {loading ? '提交中⋯' : '提交報名表'} <span className="arrow">→</span>
                </button>
              </div>

              <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: 'var(--ink-mute)' }}>
                提交後系統會將報名資訊發送到您填寫的電子信箱，請注意查收（包括垃圾郵件）。
              </p>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
          <p style={{ fontFamily: 'var(--font-noto-serif-tc), serif', color: 'var(--green-deep)', fontWeight: 600, marginBottom: 6 }}>
            報名表填寫結束，感謝您的報名
          </p>
          <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginBottom: 4 }}>隨喜功德</p>
          <p style={{ fontFamily: 'var(--font-noto-serif-tc), serif', color: 'var(--green-deep)', fontWeight: 700 }}>
            台灣四念處學會 合十
          </p>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 台灣四念處禪修學會　All rights reserved.</div>
          <div><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></div>
        </div>
      </footer>
    </>
  )
}
