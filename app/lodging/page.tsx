'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function LodgingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const [reg, setReg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    arrival_date: '',
    departure_date: '',
    payment_method: '',
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
  })
  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

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
          setForm({
            arrival_date: data.lodging.arrival_date || '',
            departure_date: data.lodging.departure_date || '',
            payment_method: data.lodging.payment_method || '',
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
          })
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, code])

  const handleSubmit = async () => {
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
      setDone(true)
      // 顯示成功後 2 秒跳去繳費頁
      setTimeout(() => router.push(`/pay?id=${id}&code=${encodeURIComponent(code)}`), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

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

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <p className="text-5xl mb-4">🙏</p>
          <h2 className="text-xl font-bold text-green-800 mb-2">食宿登記完成</h2>
          <p className="text-gray-600 mb-4">系統已寄出確認信至您的 Email。正在轉至繳費頁⋯</p>
          <a href={`/pay?id=${id}&code=${encodeURIComponent(code)}`}
            className="inline-block bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg">
            前往繳費
          </a>
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
          <p className="mt-2">提交時間：請於 <strong>6 月 20 日晚上 8 點（台北時間）前</strong>完成。</p>
        </div>

        {/* 入住 / 離開 / 繳費方式 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">一、住宿日期</h2>
          <div>
            <label className={labelCls}>入住日月潭湖畔會館日期 *</label>
            <div className="space-y-2">
              {radio('arrival_date', '2026-08-19', '8/19 入住（提前一晚，課前休息）')}
              {radio('arrival_date', '2026-08-20', '8/20 入住（當日報到）')}
            </div>
          </div>
          <div>
            <label className={labelCls}>離開日月潭湖畔會館日期 *</label>
            <div className="space-y-2">
              {radio('departure_date', '2026-08-24', '8/24 離開（課程結束當日）')}
              {radio('departure_date', '2026-08-25', '8/25 離開（延後一晚）')}
            </div>
          </div>
          <div>
            <label className={labelCls}>繳費方式 *</label>
            <div className="space-y-2">
              {radio('payment_method', 'transfer', '匯款（台灣/國外銀行帳號）')}
              {radio('payment_method', 'credit_card', '刷卡（綠界 ECPay）')}
            </div>
          </div>
        </div>

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
            {radio('arrival_transport', 'self', '自行抵達日月潭湖畔會館')}
            {radio('arrival_transport', 'taipei_bus', '主辦專車：8/19 上午 8:30 台北車站東 3 門集合')}
            {radio('arrival_transport', 'wuri_bus', '主辦專車：8/19 上午 9:30 烏日高鐵站 6 號出口 7-8 號月台')}
          </div>
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

        {/* 其他 */}
        <div className={sectionCls}>
          <h2 className="text-lg font-semibold text-green-800">六、其他</h2>
          <label className="flex items-center gap-2 text-black cursor-pointer">
            <input type="checkbox" checked={form.snoring}
              onChange={e => update('snoring', e.target.checked)} />
            睡覺會打鼾
          </label>
          <label className="flex items-start gap-2 text-black cursor-pointer">
            <input type="checkbox" className="mt-1" checked={form.agree_covid_rules}
              onChange={e => update('agree_covid_rules', e.target.checked)} />
            <span>我願意遵守主辦單位在課程期間的課程與防疫安排（含用餐禁語、手機停用、全程佩戴學員證、未經同意不得外傳資訊等規範）*</span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl">
          {submitting ? '送出中...' : '提交食宿登記'}
        </button>

        <p className="text-center text-sm text-gray-500">
          送出後系統會自動帶入繳費方案，並轉至繳費頁。
        </p>
      </div>
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
