'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LodgingContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [reg, setReg] = useState<any>(null)
  const [existingLodging, setExistingLodging] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    emergency_name: '',
    emergency_relation: '',
    emergency_phone: '',
    arrival_transport: '',
    departure_transport: '',
    bus_destination: '',
    diet: 'vegetarian',
    noon_fasting: 'after_noon',
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
  }
  const fail = (field: string, msg: string) => {
    setError(msg)
    setErrorField(field)
    setTimeout(() => {
      const el = document.getElementById(`field-${field}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
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
        if (data.lodging) {
          setExistingLodging(data.lodging)
          setForm({
            emergency_name: data.lodging.emergency_name || '',
            emergency_relation: data.lodging.emergency_relation || '',
            emergency_phone: data.lodging.emergency_phone || '',
            arrival_transport: data.lodging.arrival_transport || '',
            departure_transport: data.lodging.departure_transport || '',
            bus_destination: data.lodging.bus_destination || '',
            diet: data.lodging.diet || '',
            noon_fasting: data.lodging.noon_fasting || '',
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
          if (data.lodging.arc_url) setIdentityType('arc')
          else if (data.lodging.id_front_url) setIdentityType('id')
          else if (data.lodging.passport_url) setIdentityType('passport')
          else setIdentityType(data.registration?.residence === '台灣' ? 'id' : 'passport')
        } else {
          setIdentityType(data.registration?.residence === '台灣' ? 'id' : 'passport')
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, code])

  const handleSubmit = async () => {
    if (Date.now() > Date.UTC(2026, 5, 20, 12, 0, 0)) {
      setError('食宿登記已於 6/20 晚上 8 點截止，請聯絡學會。')
      return
    }
    if (!form.emergency_name) return fail('emergency_name', '請填寫「緊急聯絡人姓名」')
    if (!form.emergency_relation) return fail('emergency_relation', '請填寫「緊急聯絡人關係」')
    if (!form.emergency_phone) return fail('emergency_phone', '請填寫「緊急聯絡人電話」')
    if (!form.arrival_transport) return fail('arrival_transport', '請選擇「前往日月潭方式」')
    if (!form.departure_transport) return fail('departure_transport', '請選擇「離開渡假村方式」')
    if (form.departure_transport === 'bus' && !form.bus_destination) return fail('bus_destination', '請選擇「專車目的地」')
    if (!form.diet) return fail('diet', '請選擇「飲食」')
    if (!form.noon_fasting) return fail('noon_fasting', '請選擇「過午不食」')
    if (!form.snacks) return fail('snacks', '請選擇「茶點需求」')
    if (!form.photo_url) return fail('photo', '請上傳「個人相片」')

    const payload: any = { ...form, identity_type: identityType }
    if (identityType === 'id') {
      if (!form.id_front_url) return fail('id_front', '請上傳「身分證正面」')
      if (!form.id_back_url) return fail('id_back', '請上傳「身分證反面」')
      payload.passport_url = ''
      payload.arc_url = ''
    } else if (identityType === 'passport') {
      if (!form.passport_url) return fail('passport', '請上傳「護照」')
      if (!form.flight_arrival_date) return fail('flight_arrival_date', '請填寫「抵台航班日期」')
      if (!form.flight_arrival_time) return fail('flight_arrival_time', '請填寫「抵台航班時間」')
      if (!form.flight_departure_date) return fail('flight_departure_date', '請填寫「離台航班日期」')
      if (!form.flight_departure_time) return fail('flight_departure_time', '請填寫「離台航班時間」')
      payload.id_front_url = ''
      payload.id_back_url = ''
      payload.arc_url = ''
    } else if (identityType === 'arc') {
      if (!form.arc_url) return fail('arc', '請上傳「ARC / 居留證」')
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

    if (!form.agree_covid_rules) return fail('agree_covid_rules', '請勾選「同意防疫與課程規範」')

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
      if (data.lodging) setExistingLodging(data.lodging)
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isDomestic = reg?.residence === '台灣'
  const DEADLINE_MS = Date.UTC(2026, 5, 20, 12, 0, 0)
  const pastDeadline = Date.now() > DEADLINE_MS

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
          <a href="/member" className="btn btn-primary btn-block">前往學員專區</a>
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
          onChange={() => update(group, value)} />
        <span className="opt-text">
          {label}
          {sub && <small>{sub}</small>}
        </span>
      </label>
    )
  }

  return (
    <>
      <div className="page-bg">
        <div className="page-blob b1" />
        <div className="page-blob b2" />
        <div className="page-blob b3" />
      </div>

      <header className="site-header">
        <div className="container nav">
          <a href="/member/dashboard" className="brand">
            <img src="/webpage/logo.webp" alt="台灣四念處學會" className="brand-logo" />
            <span className="brand-sublabel">
              <small>Member Portal</small>
              <span>學員專區</span>
            </span>
          </a>
          <div className="nav-actions">
            <a href="/member/dashboard" className="nav-back">← 學員首頁</a>
          </div>
        </div>
      </header>

      <div className="page-header">
        <div className="container">
          <p className="page-kicker">Food &amp; Lodging Registration</p>
          <h1 className="page-title">食宿登記表</h1>
          <p className="page-subtitle">
            請於 6 月 20 日台北時間晚上 8 點前完成。<br />
            送出後僅能再修改一次（共 2 次送出機會）。
          </p>
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
                  <span><strong>序號</strong>{reg.member_id || '待編號'}</span>
                  {reg.student_id && <span><strong>學號</strong>{reg.student_id}</span>}
                  <span><strong>性別</strong>{reg.gender === 'male' ? '男' : reg.gender === 'female' ? '女' : '—'}</span>
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
                      : <> 如需修改僅能再修改一次（6/20 晚上 8 點前），修改後即無法再動。</>}
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

            {locked && (
              <div className="submit-status">
                <div className="submit-status-icon">✓</div>
                <div className="submit-status-text">
                  <h4>已完成（已修改過 1 次，無法再改）</h4>
                  <p>最後修改時間：{new Date(existingLodging.updated_at).toLocaleString('zh-TW')}　以下為唯讀內容，如有錯誤請聯絡學會。</p>
                </div>
              </div>
            )}

            <div className="alert-card">
              <div className="alert-card-title">重要提醒</div>
              <p>請慎重考慮並如實填寫。由於飯店條款限制，學會已先代墊食宿等費用，<strong>若取消報名，所付費用恕不退款、轉讓</strong>。</p>
              <p>本表單送出後僅能再修改一次（共 2 次送出機會），請務必確認後再送出。</p>
            </div>

            <div className="info-card">
              <h4><span className="icon">🏨</span>渡假村入住說明</h4>
              <ul>
                <li>渡假村辦理入住時間：每日下午 3 點後辦理入住。</li>
                <li>辦理入住時請攜帶<strong>身分證 + 健保卡（國內）或護照正本（國外）</strong>。</li>
                <li>房間一律 4 人一房，採單獨床位配置，附 2 套衛浴。</li>
                <li>每間房間皆有對外窗戶，舒適寬敞，可曬衣。</li>
                <li>請<strong>自備盥洗用具、衣架與雨具</strong>，會館不提供一次性盥洗用品。</li>
              </ul>
            </div>

            <fieldset disabled={locked} style={{ border: 'none', padding: 0, margin: 0 }}>
              <div className="form-card">
                {/* 一、緊急聯絡人 */}
                <div className="field-group">
                  <div className="field-group-title"><span className="num">01</span>緊急聯絡人</div>
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

                {/* 二、前往日月潭 */}
                <div className="field-group" id="field-arrival_transport">
                  <div className="field-group-title"><span className="num">02</span>前往日月潭方式 <span className="required">*</span></div>
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

                {/* 三、離開方式 */}
                <div className="field-group" id="field-departure_transport">
                  <div className="field-group-title"><span className="num">03</span>離開渡假村方式 <span className="required">*</span></div>
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
                        {radio('bus_destination', 'taoyuan_824_pm', '8/24 下午 6:00–6:30 專車到桃園機場第一航廈', '車程約 3 小時')}
                        {radio('bus_destination', 'taoyuan_825_am', '8/25 上午 9:00 專車到桃園機場第一航廈', '車程約 3 小時')}
                      </div>
                    </div>
                  )}
                </div>

                {/* 四、飲食 */}
                <div className="field-group">
                  <div className="field-group-title"><span className="num">04</span>飲食</div>

                  <div id="field-diet" style={{ marginBottom: 16 }}>
                    <label className="form-label">飲食選擇 <span className="required">*</span></label>
                    <div className="opt-group inline">
                      {radio('diet', 'meat', '葷食')}
                      {radio('diet', 'vegetarian', '素食')}
                    </div>
                  </div>

                  <div id="field-noon_fasting" style={{ marginBottom: 16 }}>
                    <label className="form-label">課程期間是否過午不食 <span className="required">*</span></label>
                    <div className="opt-group inline">
                      {radio('noon_fasting', 'before_noon', '需要 12 點前吃')}
                      {radio('noon_fasting', 'after_noon', '可以 12 點後吃')}
                    </div>
                  </div>

                  <div id="field-snacks" style={{ marginBottom: 16 }}>
                    <label className="form-label">是否吃茶點 <span className="required">*</span></label>
                    <div className="opt-group inline">
                      {radio('snacks', 'snacks_and_drink', '需要茶點、咖啡 OR 茶')}
                      {radio('snacks', 'drink_only', '只需要咖啡 OR 茶')}
                    </div>
                  </div>

                  <div className="opt-group">
                    <label className={`opt ${form.dinner_0819 ? 'selected' : ''}`}>
                      <input type="checkbox" checked={form.dinner_0819}
                        onChange={e => update('dinner_0819', e.target.checked)} />
                      <span className="opt-text">8/19 需要在渡假村用晚餐</span>
                    </label>
                    <label className={`opt ${form.dinner_0824 ? 'selected' : ''}`}>
                      <input type="checkbox" checked={form.dinner_0824}
                        onChange={e => update('dinner_0824', e.target.checked)} />
                      <span className="opt-text">8/24 晚上 5–6 點需要在渡假村用晚餐</span>
                    </label>
                  </div>
                </div>

                {/* 五、證件上傳 */}
                <div className="field-group">
                  <div className="field-group-title"><span className="num">05</span>證件上傳</div>
                  <p className="form-hint" style={{ marginBottom: 14 }}>支援 JPG / PNG / WEBP / PDF（5MB 以下）</p>

                  <div id="field-photo" style={{ marginBottom: 16 }}>
                    <FileField kind="photo" label="個人相片（最近 3 個月內，勿使用美顏）" required
                      currentUrl={form.photo_url} uploadingKind={uploadingKind}
                      onUpload={handleFileUpload} onPreview={setPreviewUrl}
                      error={errorField === 'photo'} />
                  </div>

                  <label className="form-label">申請人身份（三選一）<span className="required">*</span></label>
                  <div className="opt-group">
                    <label className={`opt ${identityType === 'id' ? 'selected' : ''}`}>
                      <input type="radio" name="identity_type" value="id"
                        checked={identityType === 'id'}
                        onChange={() => setIdentityType('id')} />
                      <span className="opt-text">
                        <strong>台灣人</strong>（上傳身分證正反面）
                      </span>
                    </label>
                    <label className={`opt ${identityType === 'passport' ? 'selected' : ''}`}>
                      <input type="radio" name="identity_type" value="passport"
                        checked={identityType === 'passport'}
                        onChange={() => setIdentityType('passport')} />
                      <span className="opt-text">
                        <strong>外籍短期旅客</strong>
                        <small>觀光／免簽／短期簽證入境，上傳護照 + 填寫航班資訊</small>
                      </span>
                    </label>
                    <label className={`opt ${identityType === 'arc' ? 'selected' : ''}`}>
                      <input type="radio" name="identity_type" value="arc"
                        checked={identityType === 'arc'}
                        onChange={() => setIdentityType('arc')} />
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
                            currentUrl={form.id_front_url} uploadingKind={uploadingKind}
                            onUpload={handleFileUpload} onPreview={setPreviewUrl}
                            error={errorField === 'id_front'} />
                        </div>
                        <div id="field-id_back">
                          <FileField kind="id_back" label="身分證反面" required
                            currentUrl={form.id_back_url} uploadingKind={uploadingKind}
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
                          currentUrl={form.passport_url} uploadingKind={uploadingKind}
                          onUpload={handleFileUpload} onPreview={setPreviewUrl}
                          error={errorField === 'passport'} />
                      </div>
                    </div>
                  )}
                  {identityType === 'arc' && (
                    <div className="branch active">
                      <div id="field-arc">
                        <FileField kind="arc" label="ARC／居留證" required
                          currentUrl={form.arc_url} uploadingKind={uploadingKind}
                          onUpload={handleFileUpload} onPreview={setPreviewUrl}
                          error={errorField === 'arc'} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 六、航班資訊（外籍短期旅客） */}
                {identityType === 'passport' && (
                  <div className="field-group">
                    <div className="field-group-title"><span className="num">06</span>航班資訊（外籍短期旅客必填）</div>
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
                        currentUrl={form.arrival_ticket_url} uploadingKind={uploadingKind}
                        onUpload={handleFileUpload} onPreview={setPreviewUrl} />
                      <FileField kind="departure_ticket" label="上傳離台機票（非必填）"
                        currentUrl={form.departure_ticket_url} uploadingKind={uploadingKind}
                        onUpload={handleFileUpload} onPreview={setPreviewUrl} />
                    </div>
                  </div>
                )}

                {/* 快篩另頁提示 */}
                <div className="alert-card" style={{ marginBottom: 28 }}>
                  <div className="alert-card-title">關於快篩檢測上傳</div>
                  <p>快篩檢測時程在課程開始前後（8/17、8/19、8/20、8/22）。請完成本食宿登記後，另行於專屬頁面上傳。確認信中會附上快篩上傳頁連結。</p>
                </div>

                {/* 防疫與課程規範 */}
                <div className="field-group">
                  <div className="field-group-title"><span className="num">07</span>防疫與課程規範</div>
                  <div className="rules-block">
                    <h5>傳染病相關</h5>
                    <ul>
                      <li>若在課程前幾天<strong>感冒確診</strong>並仍具傳染力，<strong>必須取消課程</strong>。</li>
                      <li>若在課程會場<strong>被檢驗出陽性</strong>，同寢室 4 人需在房間隔離，並透過 ZOOM 線上上課及互動。</li>
                      <li>若出現發燒、咳嗽、呼吸急促、胸悶、頭痛、喉嚨痛等症狀，需接受個別檢測；即使陰性亦會移至後段座位。</li>
                    </ul>
                    <h5>快篩檢測時間</h5>
                    <ul>
                      <li>檢測結果必須<strong>載明檢測日期、序號、姓名</strong>，快篩試劑請自備。</li>
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
                      onChange={e => update('agree_covid_rules', e.target.checked)} />
                    <span className="consent-check-txt">
                      我已閱讀並<strong>願意遵守以上防疫與課程規範</strong> <span className="required">*</span>
                    </span>
                  </label>
                </div>

                {/* 八、其他 */}
                <div className="field-group">
                  <div className="field-group-title"><span className="num">08</span>其他</div>
                  <label className={`opt ${form.snoring ? 'selected' : ''}`}>
                    <input type="checkbox" checked={form.snoring}
                      onChange={e => update('snoring', e.target.checked)} />
                    <span className="opt-text">睡覺會打鼾（提供同寢室友參考）</span>
                  </label>
                </div>
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
              <a href="/member/dashboard" className="btn btn-ghost">← 返回</a>
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
            </div>

            {!locked && (
              <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12.5, color: 'var(--ink-mute)' }}>
                {existingLodging
                  ? '本次為最後 1 次修改機會，送出後即鎖定。'
                  : '送出後可於 6/20 晚上 8 點前再修改 1 次，系統會寄出確認信。'}
              </p>
            )}
          </div>

          {/* Sidebar */}
          <aside>
            <div className="deadline-card">
              <div className="deadline-label">Deadline</div>
              <div className="deadline-date">06.20</div>
              <div className="deadline-text">
                台北時間晚上 <strong>8:00</strong> 前完成<br />
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

            <div className="sidebar-card">
              <h4>需要協助 <small>Help</small></h4>
              <p>聯絡學會：<br />
                <a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a>
              </p>
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
          <div>© 2026 台灣四念處禪修學會　All rights reserved.</div>
          <div><a href="mailto:satipatthana.tw@gmail.com">satipatthana.tw@gmail.com</a></div>
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
  kind, label, required, currentUrl, uploadingKind, onUpload, onPreview, error,
}: {
  kind: string
  label: string
  required?: boolean
  currentUrl: string
  uploadingKind: string | null
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
          disabled={uploading}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(kind, f) }} />
      </label>
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
