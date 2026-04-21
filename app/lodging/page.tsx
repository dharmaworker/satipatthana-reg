'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function LodgingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [reg, setReg] = useState<any>(null)
  const [existingLodging, setExistingLodging] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    emergency_name: '',
    emergency_relation: '',
    emergency_phone: '',
    arrival_transport: '',
    departure_transport: '',
    bus_destination: '',
    diet: '',
    noon_fasting: '',
    snacks: '',
    dinner_0819: false,
    dinner_0824: false,
    snoring: false,
    agree_covid_rules: false,
    // 檔案
    id_front_url: '',
    id_back_url: '',
    passport_url: '',
    photo_url: '',
    arrival_ticket_url: '',
    departure_ticket_url: '',
    test_0817_url: '',
    test_0819_url: '',
    // 航班
    flight_arrival_date: '',
    flight_arrival_time: '',
    flight_departure_date: '',
    flight_departure_time: '',
  })
  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  // 證件類型（身分證 or 護照）— UI 狀態，非 DB 欄位
  const [identityType, setIdentityType] = useState<'id' | 'passport'>('id')

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
          // 依已上傳的檔案推測證件類型；皆無則依居住地預設
          if (data.lodging.passport_url && !data.lodging.id_front_url) {
            setIdentityType('passport')
          } else if (data.lodging.id_front_url) {
            setIdentityType('id')
          } else {
            setIdentityType(data.registration?.residence === '台灣' ? 'id' : 'passport')
          }
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
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/lodging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '送出失敗')
      if (data.lodging) setExistingLodging(data.lodging)
      setDone(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isDomestic = reg?.residence === '台灣'
  const DEADLINE_MS = Date.UTC(2026, 5, 20, 12, 0, 0) // 6/20 20:00 Taipei = 12:00 UTC
  const pastDeadline = Date.now() > DEADLINE_MS

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  if (error && !reg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  const hasEdited = !!(existingLodging && existingLodging.updated_at !== existingLodging.created_at)
  const locked = hasEdited // 鎖定唯讀：已修改過一次

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <p className="text-5xl mb-4">🙏</p>
          <h2 className="text-xl font-bold text-green-800 mb-2">食宿登記已送出</h2>
          <p className="text-gray-600 mb-4">
            系統已寄出確認信至您的 Email，請注意查收。<br />
            {hasEdited
              ? <strong className="text-red-600">本表單已修改過一次，無法再修改。若需更動請聯絡學會。</strong>
              : <span>如需修改，<strong className="text-red-600">僅能再修改一次</strong>（6/20 晚上 8 點前），修改後即無法再動。</span>}
          </p>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white'
  const labelCls = 'block text-sm font-medium text-black mb-1'
  const sectionCls = 'bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4'
  const radio = (group: string, value: string, label: string) => (
    <label key={value} className="flex items-center gap-2 cursor-pointer text-black">
      <input type="radio" name={group} value={value}
        checked={(form as any)[group] === value}
        onChange={() => update(group, value)} />
      {label}
    </label>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-6 px-4 text-center">
        <h1 className="text-xl font-bold">第二屆台灣四念處禪修－食宿登記表</h1>
        <p className="text-sm text-green-200 mt-1">{reg.chinese_name} 法友 ／ 學號 {reg.member_id || '待編號'}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <p>請慎重考慮並如實填寫。由於飯店條款限制，學會已先代墊食宿等費用，若取消報名，所付費用恕不退款、轉讓。</p>
          <p className="mt-2">提交時間：請於 <strong>6 月 20 日晚上 8 點（台北時間）前</strong>完成，逾期系統將拒絕提交。</p>
          <p className="mt-2 text-red-700"><strong>⚠️ 本表單送出後僅能再修改一次（共計 2 次送出機會），請務必確認後再送出。</strong></p>
        </div>

        {existingLodging && !hasEdited && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-sm text-yellow-900">
            <p className="font-semibold">✅ 您已送出食宿登記（尚有 1 次修改機會）</p>
            <p className="mt-1">送出時間：{new Date(existingLodging.updated_at).toLocaleString('zh-TW')}</p>
            <p className="mt-1">如需修改，請在此頁面調整後再次送出。<strong>修改僅能進行一次，送出後即無法再改。</strong></p>
          </div>
        )}

        {locked && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            <p className="font-semibold">✅ 您已完成食宿登記（已修改過 1 次，無法再改）</p>
            <p className="mt-1">最後修改時間：{new Date(existingLodging.updated_at).toLocaleString('zh-TW')}</p>
            <p className="mt-1">以下為您送出的內容（唯讀）。如有錯誤請聯絡學會。</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-1">
          <p className="font-semibold">渡假村入住說明</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>渡假村辦理入住時間：每日下午 3 點後辦理入住。</li>
            <li><span className="text-red-600 font-semibold">辦理入住時請攜帶身分證＋健保卡（國內）或護照正本（國外）。</span></li>
            <li>房間一律 4 人一房，採單獨床位配置，附 2 套衛浴。</li>
            <li>每間房間皆有對外窗戶，舒適寬敞，可曬衣。</li>
            <li>請<strong>自備盥洗用具、衣架與<span className="text-red-600">雨具</span></strong>，會館不提供一次性盥洗用品。</li>
          </ul>
        </div>

        {/* 學員資料（由報名表帶入，唯讀） */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">學員資料</h2>
          <p className="text-xs text-gray-500">以下資料由報名表自動帶入，如需修改請聯絡學會</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">中文姓名</div>
              <div className="text-black font-medium">{reg.chinese_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">護照英文姓名</div>
              <div className="text-black font-medium break-all">{reg.passport_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">學號</div>
              <div className="text-black font-medium">{reg.member_id || '待編號'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">性別</div>
              <div className="text-black font-medium">{reg.gender === 'male' ? '男' : reg.gender === 'female' ? '女' : '—'}</div>
            </div>
            {reg.dharma_name && (
              <div>
                <div className="text-xs text-gray-500">法名</div>
                <div className="text-black font-medium">{reg.dharma_name}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">手機號碼</div>
              <div className="text-black font-medium">{reg.phone || '—'}</div>
            </div>
            <div className={reg.dharma_name ? '' : 'col-span-2'}>
              <div className="text-xs text-gray-500">Email</div>
              <div className="text-black font-medium break-all">{reg.email || '—'}</div>
            </div>
          </div>
        </div>


        <fieldset disabled={locked} style={{ display: 'contents' }}>
        {/* 緊急聯絡人 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">二、緊急聯絡人</h2>
          <div>
            <label className={labelCls}>姓名 *</label>
            <input className={inputCls} value={form.emergency_name}
              onChange={e => update('emergency_name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>關係 *</label>
            <input className={inputCls} placeholder="例：配偶、父母、朋友"
              value={form.emergency_relation}
              onChange={e => update('emergency_relation', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>聯絡電話 *</label>
            <input className={inputCls} placeholder="請加國碼，例：台灣 886+" value={form.emergency_phone}
              onChange={e => update('emergency_phone', e.target.value)} />
          </div>
        </div>

        {/* 課程前往方式 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">三、前往日月潭方式 *</h2>
          <div className="space-y-2">
            {radio('arrival_transport', 'self', '8/19 自行抵達日月潭湖畔會館')}
            {radio('arrival_transport', 'taipei_bus', '主辦專車：8/19 上午 8:30 台北車站東 3 門集合（法工人員穿著學會背心）')}
            {form.arrival_transport === 'taipei_bus' && (
              <LocationMap label="台北車站位置示意圖（集合點：東三門全家與郵局樓梯口）"
                src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/taipei-station.jpg" />
            )}
            {radio('arrival_transport', 'wuri_bus', '主辦專車：8/19 上午 9:30 烏日高鐵站 6 號出口 7-8 號月台（法工人員穿著學會背心）')}
            {form.arrival_transport === 'wuri_bus' && (
              <LocationMap label="台中高鐵站一樓 6 號出口示意圖"
                src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/wuri-hsr.jpg" />
            )}
            {radio('arrival_transport', 'airport_bus_0819', '主辦專車：8/19 下午 2:30 桃園機場第一航廈接機大廳右邊集合（法工人員穿著學會背心）')}
            {form.arrival_transport === 'airport_bus_0819' && (
              <LocationMap label="桃園機場第一航廈一樓集合點示意圖"
                src="https://stjghujtfuhbbskgbjau.supabase.co/storage/v1/object/public/location-maps/taoyuan-airport-t1.jpg" />
            )}
            {radio('arrival_transport', 'self_0820', '8/20 上午 7 點前自行抵達日月潭湖畔會館')}
          </div>
          {!isDomestic && (form.arrival_transport === 'self' || form.arrival_transport === 'self_0820') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <p className="font-semibold">國外學員自行前往可聯絡：</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>桃園機場計程車預約電話：03-3834499</li>
                <li>台灣大車隊計程車手機直撥：55688</li>
                <li>大都會計程車手機直撥：55178</li>
              </ul>
            </div>
          )}
        </div>

        {/* 離開方式 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">四、離開渡假村方式 *</h2>
          <div className="space-y-2">
            {radio('departure_transport', 'self', '自行離開')}
            {radio('departure_transport', 'bus', '乘坐主辦單位安排專車')}
          </div>
          {form.departure_transport === 'bus' && (
            <div className="pl-6">
              <label className={labelCls}>專車目的地 *</label>
              <div className="space-y-2">
                {radio('bus_destination', 'taipei_824_pm', '8/24 下午 6:00–6:30 專車到台北車站')}
                {radio('bus_destination', 'taipei_825_am', '8/25 上午 9:00 專車到台北車站')}
                {radio('bus_destination', 'wuri_825_am', '8/25 上午 9:00 專車到烏日高鐵')}
                {radio('bus_destination', 'taoyuan_824_pm', '8/24 下午 6:00–6:30 專車到桃園機場第一航廈（車程約 3 小時）')}
                {radio('bus_destination', 'taoyuan_825_am', '8/25 上午 9:00 專車到桃園機場第一航廈（車程約 3 小時）')}
              </div>
            </div>
          )}
        </div>

        {/* 飲食 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">五、飲食</h2>
          <div>
            <label className={labelCls}>飲食選擇 *</label>
            <div className="space-y-2">
              {radio('diet', 'meat', '葷食')}
              {radio('diet', 'vegetarian', '素食')}
            </div>
          </div>
          <div>
            <label className={labelCls}>課程期間是否過午不食 *</label>
            <div className="space-y-2">
              {radio('noon_fasting', 'before_noon', '需要 12 點前吃')}
              {radio('noon_fasting', 'after_noon', '可以 12 點後吃')}
            </div>
          </div>
          <div>
            <label className={labelCls}>是否吃茶點 *</label>
            <div className="space-y-2">
              {radio('snacks', 'snacks_and_drink', '需要茶點、咖啡 OR 茶')}
              {radio('snacks', 'drink_only', '只需要咖啡 OR 茶')}
            </div>
          </div>
          <label className="flex items-center gap-2 text-black cursor-pointer">
            <input type="checkbox" checked={form.dinner_0819}
              onChange={e => update('dinner_0819', e.target.checked)} />
            8/19 需要在渡假村用晚餐
          </label>
          <label className="flex items-center gap-2 text-black cursor-pointer">
            <input type="checkbox" checked={form.dinner_0824}
              onChange={e => update('dinner_0824', e.target.checked)} />
            8/24 晚上 5–6 點需要在渡假村用晚餐
          </label>
        </div>

        {/* 證件上傳 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">六、證件上傳</h2>
          <p className="text-xs text-gray-500">可上傳 JPG / PNG / WEBP / PDF（5MB 以下）</p>
          {fileField('photo', '個人相片（最近 3 個月內，勿使用美顏）*', form.photo_url, uploadingKind, handleFileUpload)}

          <div>
            <label className={labelCls}>身分證／護照（擇一上傳）*</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-black">
                <input type="radio" name="identity_type" value="id"
                  checked={identityType === 'id'}
                  onChange={() => setIdentityType('id')} />
                身分證（正反面皆需上傳）
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-black">
                <input type="radio" name="identity_type" value="passport"
                  checked={identityType === 'passport'}
                  onChange={() => setIdentityType('passport')} />
                護照
              </label>
            </div>
          </div>
          {identityType === 'id' ? (
            <>
              {fileField('id_front', '身分證正面 *', form.id_front_url, uploadingKind, handleFileUpload)}
              {fileField('id_back', '身分證反面 *', form.id_back_url, uploadingKind, handleFileUpload)}
            </>
          ) : (
            fileField('passport', '護照 *', form.passport_url, uploadingKind, handleFileUpload)
          )}
        </div>

        {/* 國外學員航班 */}
        {!isDomestic && (
          <div className={sectionCls}>
            <h2 className="text-lg font-semibold text-green-800">七、航班資訊</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>抵台航班日期</label>
                <input type="date" className={inputCls} value={form.flight_arrival_date}
                  onChange={e => update('flight_arrival_date', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>抵台航班具體時間</label>
                <input type="text" className={inputCls} placeholder="例：14:30" value={form.flight_arrival_time}
                  onChange={e => update('flight_arrival_time', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>離台航班日期</label>
                <input type="date" className={inputCls} value={form.flight_departure_date}
                  onChange={e => update('flight_departure_date', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>離台航班具體時間</label>
                <input type="text" className={inputCls} placeholder="例：16:45" value={form.flight_departure_time}
                  onChange={e => update('flight_departure_time', e.target.value)} />
              </div>
            </div>
            {fileField('arrival_ticket', '上傳來台機票（非必填）', form.arrival_ticket_url, uploadingKind, handleFileUpload)}
            {fileField('departure_ticket', '上傳離台機票（非必填）', form.departure_ticket_url, uploadingKind, handleFileUpload)}
          </div>
        )}

        {/* 快篩另頁上傳，這裡僅提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-semibold">關於快篩檢測上傳</p>
          <p className="mt-1">快篩檢測時程在課程開始前後（8/17、8/19、8/20、8/22），時間較晚，請完成本食宿登記後另行於專屬頁面上傳。完成此食宿登記送出後，系統會在確認信中附上快篩上傳頁連結。</p>
        </div>

        {/* 防疫與課程規範 */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900 space-y-2">
          <p className="font-semibold text-red-800">防疫與課程規範（請務必閱讀）</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>若在課程前幾天<strong>感冒確診</strong>並仍具傳染力，<strong>必須取消課程</strong>。</li>
            <li>若在課程會場（課程開始前或課程中）<strong>被檢驗出陽性</strong>，同寢室 4 人需在房間隔離，並透過 ZOOM 線上上課及互動，不能與其他學員一起上課及用餐。</li>
            <li>若出現發燒、咳嗽、呼吸急促、胸悶、頭痛、喉嚨痛等症狀，需接受主辦單位個別檢測；即使陰性亦會移至後段座位，與其他學員隔開。</li>
            <li><strong>快篩檢測時間</strong>（檢測結果必須載明檢測日期、學號、姓名，快篩試劑請自備，主辦單位不提供）：
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
                <li>開課前：8/17 上午 8:00–晚上 8:00 前上傳、8/19 上午 12:00 前上傳（於快篩頁上傳）</li>
                <li>課程期間：8/20、8/22 上午 8:00 前<strong>現場繳交</strong>（不需線上上傳）</li>
              </ul>
            </li>
            <li>課程期間全程配戴口罩。</li>
            <li>課程期間一律停用手機等通訊設備。</li>
            <li>用餐時必須禁語。</li>
            <li>請務必全程佩戴學員證。</li>
            <li>為示尊重，未得老師允許，上課中請勿拍照、攝影或錄音。</li>
            <li>本次課程所有座位皆是座椅，請勿佔座位，離開時請記得將個人物品帶走。</li>
            <li>請勿攜帶貴重物品至會場，個人隨身物品請自行妥善保管。</li>
            <li>請穿著整齊、舒適且適宜聞法的衣著。</li>
            <li>課程會場長時開著冷氣，畏寒者可攜帶禦寒衣物（如圍巾、披肩、襪子等）。</li>
          </ul>
        </div>

        {/* 其他 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">九、其他</h2>
          <label className="flex items-center gap-2 text-black cursor-pointer">
            <input type="checkbox" checked={form.snoring}
              onChange={e => update('snoring', e.target.checked)} />
            睡覺會打鼾
          </label>
          <label className="flex items-start gap-2 text-black cursor-pointer">
            <input type="checkbox" className="mt-1" checked={form.agree_covid_rules}
              onChange={e => update('agree_covid_rules', e.target.checked)} />
            <span>我已閱讀並<strong>願意遵守以上防疫與課程規範</strong> *</span>
          </label>
        </div>
        </fieldset>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        {pastDeadline && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-red-700 text-sm text-center">
            食宿登記已於 6/20 晚上 8 點（台北時間）截止，無法再提交。如有特殊狀況請聯絡學會。
          </div>
        )}
        <button onClick={handleSubmit} disabled={submitting || pastDeadline || locked}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl">
          {submitting
            ? '送出中...'
            : pastDeadline
            ? '已截止'
            : locked
            ? '已修改過 1 次，無法再改'
            : existingLodging
            ? '送出修改（最後 1 次機會）'
            : '提交食宿登記'}
        </button>

        {!locked && (
          <p className="text-center text-sm text-gray-500">
            {existingLodging
              ? '本次為最後 1 次修改機會，送出後即鎖定。'
              : '送出後可於 6/20 晚上 8 點前再修改 1 次，系統會寄出確認信。'}
          </p>
        )}
      </div>
    </div>
  )
}

function LocationMap({ label, src }: { label: string; src: string }) {
  return (
    <div className="ml-6 mt-1 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-700 border-b border-gray-200">{label}</div>
      <a href={src} target="_blank" rel="noreferrer" title="點擊開啟原圖">
        <img src={src} alt={label} className="w-full h-auto max-h-72 object-contain" />
      </a>
    </div>
  )
}

function planDates(plan: string | null | undefined): [string, string] | null {
  if (!plan) return null
  const map: Record<string, [string, string]> = {
    A: ['2026-08-20', '2026-08-24'],
    B: ['2026-08-19', '2026-08-24'],
    C: ['2026-08-19', '2026-08-25'],
    D: ['2026-08-20', '2026-08-25'],
    T: ['2026-08-20', '2026-08-24'],
  }
  return map[plan.charAt(0)] || null
}

function fileField(
  kind: string,
  label: string,
  currentUrl: string,
  uploadingKind: string | null,
  onUpload: (kind: string, f: File) => void,
) {
  const isImage = currentUrl && !currentUrl.toLowerCase().endsWith('.pdf')
  const uploading = uploadingKind === kind
  const inputId = `file-${kind}`
  return (
    <div key={kind} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="block text-sm font-semibold text-black">{label}</label>
        {currentUrl && <span className="text-xs text-green-700 font-medium whitespace-nowrap">✓ 已上傳</span>}
      </div>

      {currentUrl && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded p-2">
          {isImage ? (
            <img src={currentUrl} alt={kind} className="w-16 h-16 object-cover border rounded" />
          ) : (
            <span className="text-2xl">📄</span>
          )}
          <a href={currentUrl} target="_blank" rel="noreferrer"
            className="text-sm text-blue-600 underline">點此檢視</a>
        </div>
      )}

      <label htmlFor={inputId}
        className={`block w-full border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
          uploading
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
            : currentUrl
            ? 'border-green-400 bg-green-50 hover:bg-green-100 text-green-800'
            : 'border-green-500 bg-white hover:bg-green-50 text-green-800'
        }`}>
        {uploading ? (
          <>
            <div className="text-2xl mb-1">⏳</div>
            <div className="text-sm font-medium">上傳中，請稍候...</div>
          </>
        ) : (
          <>
            <div className="text-3xl mb-1">📤</div>
            <div className="text-sm font-semibold">
              {currentUrl ? '點此重新上傳' : '點此選擇檔案上傳'}
            </div>
            <div className="text-xs text-gray-600 mt-1">支援 JPG / PNG / WEBP / PDF（5MB 以下）</div>
          </>
        )}
        <input id={inputId} type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={uploading}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(kind, f) }} />
      </label>
    </div>
  )
}

export default function LodgingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">載入中...</div>}>
      <LodgingContent />
    </Suspense>
  )
}
