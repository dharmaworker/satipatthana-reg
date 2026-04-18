'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const THAILAND_COURSES = [
  '第一屆 2014/07', '第二屆 2014/09', '第三屆 2014/11',
  '第四屆 2015/05', '第五屆 2015/09', '第六屆 2016/05',
  '第七屆 2017/08', '第八屆 2017/12', '第九屆 2018/05',
  '第十屆 2018/11', '第十一屆 2019/03', '第十二屆 2019/12',
  '第十三屆 2024/02', '第十四屆 2025/07', '第十五屆 2025/10',
]
const MALAYSIA_COURSES = [
  '第一屆 2023/03', '第二屆 2024/04', '第三屆 2025/03', '第四屆 2026/03',
]
const TAIWAN_COURSES = ['第一屆 2024/08']
const SINGAPORE_COURSES = ['第一屆 2024/11']
const ONLINE_COURSES = [
  '第一屆 2021/04', '第二屆 2021/08', '第三屆 2022/02',
  '第四屆 2022/06', '第五屆 2022/09', '第六屆 2023/05',
  '第七屆 2023/10', '第八屆 2024/06', '第九屆 2024/10',
  '第十屆 2025/03', '第十一屆 2025/10', '第十二屆 2026/02', '第十三屆 2026/03',
]
const CHENGDU_COURSES = ['成都讀者交流會 2024/06']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    honest_confirm: 'yes',
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
    contact_app: '',
    attended_courses: [] as string[],
  })

  const update = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleCourse = (course: string) => {
    setForm(prev => ({
      ...prev,
      attended_courses: prev.attended_courses.includes(course)
        ? prev.attended_courses.filter(c => c !== course)
        : [...prev.attended_courses, course],
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
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

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white'
  const labelClass = 'block text-sm font-medium text-black mb-1'
  const radioClass = 'flex items-center gap-2 cursor-pointer text-black'
  const sectionClass = 'bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">第二屆台灣四念處禪修</h1>
        <p className="mt-2 text-green-200">課程報名表</p>
        <p className="mt-1 text-sm text-green-300">報名時間：2026/05/11 上午10點 ～ 2026/05/25 晚上10點</p>
      </div>

      {/* 課程介紹 */}
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center space-y-4">
          <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
      {`大夢醒時，
      看見，即是覺醒的開始。
      迷失在念頭的夢境裡太久，
      是時候回過頭來，
      如實看見生命的真相。
      本次禪修課程，誠摯邀請您
      於日月潭的山水之間，
      在四位助教老師的指導下，
      親自走上四念處的覺醒之道。
      修行，
      就從這一刻的「看見」開始。`}
          </div>

          <hr className="border-gray-100" />

          <div className="text-gray-700 text-sm space-y-2">
            <p className="font-medium text-green-800">【傳承與指導】</p>
            <p>承蒙 隆波帕默尊者慈悲指定，助教團隊親自指導</p>
            <p className="font-medium text-green-800 mt-2">指導老師陣容</p>
            <div className="grid grid-cols-2 gap-2 text-left max-w-md mx-auto">
              <div>
                <p className="font-medium">阿姜巴山</p>
                <p className="text-gray-500 text-xs">Ajahn Prasan Bhuddhakulsomsir</p>
              </div>
              <div>
                <p className="font-medium">阿姜納</p>
                <p className="text-gray-500 text-xs">Ajahn Nat Sriwachirawat</p>
              </div>
              <div>
                <p className="font-medium">阿姜妮</p>
                <p className="text-gray-500 text-xs">Ajahn Nitiya Petchpaibool</p>
              </div>
              <div>
                <p className="font-medium">阿姜松</p>
                <p className="text-gray-500 text-xs">Ajahn Napatpol Kunatanasate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* 第一部分：課程說明 */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-green-800">課程資訊</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>📅 課程時間：2026年8月20日至8月24日（共5天）</p>
            <p>📍 課程地點：南投日月潭湖畔會館</p>
            <p>👥 課程名額：250名（額滿為止）</p>
            <p>💰 課程費用：課程免費，食宿場地交通費用 NT$18,600 自理</p>
          </div>
        </div>

        {/* 第一題 */}
        <div className={sectionClass}>
          <label className={labelClass}>1. 您是否願意承諾如實填寫本次的報名表單？*</label>
          {[['yes', '是'], ['no', '否（將結束報名）']].map(([val, label]) => (
            <label key={val} className={radioClass}>
              <input type="radio" name="honest_confirm" value={val}
                checked={form.honest_confirm === val}
                onChange={e => update('honest_confirm', e.target.value)} />
              {label}
            </label>
          ))}
          {form.honest_confirm === 'no' && (
            <p className="text-red-500 text-sm">感謝您的誠實，報名表將不予提交。</p>
          )}
        </div>

        {form.honest_confirm === 'yes' && (<>

        {/* 第二部分：報名條件 */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-green-800">第二部分：報名條件確認</h2>

          <div>
            <label className={labelClass}>2. 是否以正式學員身份參加過隆波帕默尊者體系的實體或線上課程？*</label>
            {[['yes', '是'], ['no', '否']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="attended_formal" value={val}
                  checked={form.attended_formal === val}
                  onChange={e => update('attended_formal', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          {/* 課程選擇 */}
          {[
            ['泰國四念處禪修課程', THAILAND_COURSES],
            ['馬來西亞四念處禪修課程', MALAYSIA_COURSES],
            ['台灣四念處禪修課程', TAIWAN_COURSES],
            ['新加坡四念處禪修課程', SINGAPORE_COURSES],
            ['遠程（線上）四念處禪修課程', ONLINE_COURSES],
            ['成都讀者交流會', CHENGDU_COURSES],
          ].map(([title, courses]) => (
            <div key={title as string}>
              <label className={labelClass}>{title as string}（非必選）</label>
              <div className="grid grid-cols-2 gap-2">
                {(courses as string[]).map(course => (
                  <label key={course} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox"
                      checked={form.attended_courses.includes(course)}
                      onChange={() => toggleCourse(course)} />
                    {course}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className={labelClass}>9. 是否完整觀看/聆聽過至少3屆泰國四念處之旅的錄影/錄音？*</label>
            {[['yes', '是'], ['no', '否']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="watched_recordings" value={val}
                  checked={form.watched_recordings === val}
                  onChange={e => update('watched_recordings', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className={labelClass}>10. 是否透過ZOOM獲得指導老師一對一禪修指導？*</label>
            {[['yes', '是'], ['no', '否']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="zoom_guidance" value={val}
                  checked={form.zoom_guidance === val}
                  onChange={e => update('zoom_guidance', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className={labelClass}>11. 是否觀看/聆聽過隆波帕默尊者法談開示30篇以上？*</label>
            {[['yes', '是'], ['no', '否']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="watched_30_talks" value={val}
                  checked={form.watched_30_talks === val}
                  onChange={e => update('watched_30_talks', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className={labelClass}>12. 您是否持守五戒？*</label>
            {[['yes', '是'], ['no', '否']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="keep_precepts" value={val}
                  checked={form.keep_precepts === val}
                  onChange={e => update('keep_precepts', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className={labelClass}>13. 您學習並實踐隆波帕默尊者的教導多久了？*</label>
            <select className={inputClass} value={form.practice_years}
              onChange={e => update('practice_years', e.target.value)}>
              <option value="">請選擇</option>
              {['1月-3個月','3月-6個月','6月-1年','1年-2年','2年-3年','3年-4年','4年-5年','5年-8年','8年-10年','10年以上'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>14. 過去三個月內，您做固定式練習的頻率是？*</label>
            <select className={inputClass} value={form.practice_frequency}
              onChange={e => update('practice_frequency', e.target.value)}>
              <option value="">請選擇</option>
              <option value="every_day">每天至少30分鐘</option>
              <option value="almost_every_day">幾乎每天，偶有間斷</option>
              <option value="commit_from_now">承諾從現在開始每天堅持</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>15. 是否願意於6月15日前按時支付食宿場地交通費用？*</label>
            {[['yes', '是，我願意按時全額支付'], ['no', '否']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="pay_confirm" value={val}
                  checked={form.pay_confirm === val}
                  onChange={e => update('pay_confirm', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className={labelClass}>16. 您是否身體健康，能夠全程獨立參與？*</label>
            {[['yes', '是'], ['no', '否']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="health_confirm" value={val}
                  checked={form.health_confirm === val}
                  onChange={e => update('health_confirm', e.target.value)} />
                {label}
              </label>
            ))}
          </div>


          <label className={labelClass}>17. 您是否有心理或精神疾病史？*</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-black">
              <input type="radio" name="mental_health" value="no"
                checked={form.mental_health_note === 'no' || form.mental_health_note === ''}
                onChange={() => update('mental_health_note', 'no')} />
              否，無心理或精神疾病史
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-black">
              <input type="radio" name="mental_health" value="yes"
                checked={form.mental_health_note.startsWith('yes')}
                onChange={() => update('mental_health_note', 'yes:')} />
              是，請詳細說明
            </label>
          </div>
          {form.mental_health_note.startsWith('yes') && (
            <textarea
              className={inputClass + ' mt-2'}
              rows={3}
              placeholder="請詳細說明您的狀況"
              value={form.mental_health_note.replace('yes:', '')}
              onChange={e => update('mental_health_note', 'yes:' + e.target.value)}
            />
          )}
        </div>



        {/* 第三部分：個人資訊 */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-green-800">第三部分：個人資訊</h2>

          <div>
            <label className={labelClass}>19. 中文姓名（身分證/護照姓名）*</label>
            <input className={inputClass} value={form.chinese_name}
              onChange={e => update('chinese_name', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>20. 護照英文姓名*</label>
            <input className={inputClass} value={form.passport_name}
              onChange={e => update('passport_name', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>21. 您屬於？*</label>
            {[['lay', '在家人（居士）'], ['monastic', '僧眾']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="identity" value={val}
                  checked={form.identity === val}
                  onChange={e => update('identity', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          {form.identity === 'monastic' && (
            <div>
              <label className={labelClass}>22. 法名（僧眾填寫）</label>
              <input className={inputClass} value={form.dharma_name}
                onChange={e => update('dharma_name', e.target.value)} />
            </div>
          )}

          <div>
            <label className={labelClass}>23. 性別*</label>
            {[['male', '男'], ['female', '女']].map(([val, label]) => (
              <label key={val} className={radioClass}>
                <input type="radio" name="gender" value={val}
                  checked={form.gender === val}
                  onChange={e => update('gender', e.target.value)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className={labelClass}>24. 年齡*</label>
            <input type="number" className={inputClass} value={form.age}
              onChange={e => update('age', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>25. 護照頒發地</label>
            <input className={inputClass} value={form.passport_country}
              onChange={e => update('passport_country', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>26. 居住地*</label>
            <select className={inputClass} value={form.residence}
              onChange={e => update('residence', e.target.value)}>
              <option value="">請選擇</option>
              {['台灣','中國大陸/內地','香港','澳門','馬來西亞','泰國','日本','美國','加拿大','新加坡','英國','斯里蘭卡','其他地區'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>27. 手機號碼*（海外請加國際碼）</label>
            <input className={inputClass} value={form.phone}
              onChange={e => update('phone', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>28. 電子信箱（E-MAIL）*</label>
            <input type="email" className={inputClass} value={form.email}
              onChange={e => update('email', e.target.value)} />
          </div>
<div>
  <label className={labelClass}>29. 通訊軟體（擇一填寫）</label>
  <div className="space-y-3">
    <div>
      <label className="flex items-center gap-2 cursor-pointer text-black mb-1">
        <input type="radio" name="contact_app" value="line"
          checked={form.contact_app === 'line'}
          onChange={() => update('contact_app', 'line')} />
        LINE ID
      </label>
      {form.contact_app === 'line' && (
        <input className={inputClass} placeholder="請填寫 LINE ID"
          value={form.line_id}
          onChange={e => update('line_id', e.target.value)} />
      )}
    </div>
    <div>
      <label className="flex items-center gap-2 cursor-pointer text-black mb-1">
        <input type="radio" name="contact_app" value="wechat"
          checked={form.contact_app === 'wechat'}
          onChange={() => update('contact_app', 'wechat')} />
        微信號（WeChat ID）
      </label>
      {form.contact_app === 'wechat' && (
        <input className={inputClass} placeholder="請填寫微信號"
          value={form.wechat_id}
          onChange={e => update('wechat_id', e.target.value)} />
      )}
    </div>
  </div>
</div>
        </div>

        {/* 費用說明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-semibold text-yellow-800">18. 費用說明</h3>
          <p className="text-yellow-700 mt-2">8/20-8/24 禪修食宿、交通、場地費用：<strong>NT$18,600 元整</strong></p>
          <p className="text-sm text-yellow-600 mt-1">錄取後將提供專屬繳費碼，請於6月15日前完成繳費。</p>
        </div>

        {/* 提交 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl transition-colors">
          {loading ? '提交中...' : '提交報名表'}
        </button>

        <p className="text-center text-sm text-gray-500">
          提交後系統會將報名資訊發送到您填寫的電子信箱，請注意查收（包括垃圾郵件）。
        </p>

        </>)}
      </div>
    </div>
  )
}