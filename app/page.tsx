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

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
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

    // 報名條件檢查
    if (form.honest_confirm !== 'yes') {
      setError('請確認已承諾如實填寫')
      return
    }
    // 聞法條件：Q2 / Q9 / Q10 / Q11 任一為「是」即可
    const heardDharma =
      form.attended_formal === 'yes' ||
      form.watched_recordings === 'yes' ||
      form.zoom_guidance === 'yes' ||
      form.watched_30_talks === 'yes'
    if (!heardDharma) {
      setError('聞法條件未達成：第 2、9、10、11 題需至少有一項選「是」（正式學員／3 屆錄影／ZOOM 指導／30 篇法談）')
      return
    }
    if (form.keep_precepts !== 'yes') {
      setError('報名條件：需持守五戒（第 12 題須選「是」）')
      return
    }
    if (!form.practice_frequency) {
      setError('請回答第 14 題：固定練習頻率')
      return
    }
    if (form.pay_confirm !== 'yes') {
      setError('需同意於 6/15 前完成繳費（第 15 題須選「是」）')
      return
    }
    if (form.health_confirm !== 'yes') {
      setError('需確認身體健康能全程參與（第 16 題須選「是」）')
      return
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
      「看見」，正是解脫的起點。
      在念頭的夢境中迷失已久，
      是時候回過頭來，
      如實觀照生命的真相。
      誠摯邀請您—
      走入日月潭的山水之間，
      在四位助教老師的引導下，
      親自踏上四念處的覺醒之路。

      修行，
      就從此時此刻的「看見」開始。`}
          </div>

          <hr className="border-gray-100" />

          <div className="text-gray-700 text-sm space-y-2">
            <p className="font-medium text-green-800">【傳承與指導】</p>
            <p>承蒙 隆波帕默尊者慈悲指定，<br />助教老師團隊親自指導</p>
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
          <h2 className="text-lg font-semibold text-green-800">一、課程資訊</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>📅 課程時間：2026年8月20日至8月24日（共5天）</p>
            <p>📍 課程方式：實體禪修</p>
            <p>📍 課程地點：南投日月潭湖畔會館</p>
            <p>👥 課程名額：250名（額滿為止）</p>
            <p>💰 課程費用：課程免費，食宿、場地及交通等費用自理</p>
          </div>

          <h2 className="text-lg font-semibold text-green-800 mt-6">二、報名時間</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>報名時間：2026年5月11日（一）上午 10點（台北時間）</p>
            <p>截止時間：2026年5月25日（一）晚上 10點（台北時間止）</p>
          </div>

          <h2 className="text-lg font-semibold text-green-800 mt-6">三、課程名額</h2>
          <p className="text-sm text-gray-600">250名（額滿為止）</p>
        </div>

        {/* 四、課程報名條件 */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-green-800">四、課程報名條件</h2>
          <p className="text-sm text-gray-700">報名者需<strong>同時滿足</strong>以下三條件：</p>
          <div className="text-sm text-gray-700 space-y-2">
            <div>
              <p><strong>1. 聞法條件</strong>（需滿足以下任意 1 個）</p>
              <ul className="list-disc pl-6 space-y-1 mt-1">
                <li>曾參加過任意一屆隆波帕默尊者體系的線下實體課程或線上網路課程</li>
                <li>參加過每月 ZOOM 指導老師線上互動</li>
                <li>完整觀看／聆聽過 3 屆泰國禪修之旅課程錄影／錄音（第 1–15 屆均可）</li>
                <li>觀看／聆聽隆波帕默尊者法談開示 30 篇以上</li>
              </ul>
            </div>
            <p><strong>2. 持守五戒</strong></p>
            <p><strong>3. 堅持做固定形式的練習</strong>（如：經行、靜坐⋯）</p>
          </div>
        </div>

        {/* 五、報名及錄取說明 */}
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-green-800">五、報名及錄取說明</h2>

          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>1. 報名方式：</strong>可透過以下任一平台填寫報名表單提交</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>台灣四念處學會網站：<a href="https://satipatthana.org.tw/" className="text-blue-700 underline" target="_blank" rel="noreferrer">https://satipatthana.org.tw/</a></li>
              <li>甘露雨網站：Ganluyu.org</li>
              <li>法藏平台：
                <div className="pl-4 text-xs text-gray-600">
                  1. 法藏資源：<a href="https://www.iDhamma.cn" className="text-blue-700 underline" target="_blank" rel="noreferrer">https://www.iDhamma.cn</a><br />
                  2. 直播綜合：<a href="https://www.iDhamma.net" className="text-blue-700 underline" target="_blank" rel="noreferrer">https://www.iDhamma.net</a>
                </div>
              </li>
              <li>台灣四念處學會 FB 官方</li>
              <li>台灣四念處學會 LINE 官方</li>
            </ul>
          </div>

          <div className="text-sm text-gray-700 space-y-2 mt-4">
            <p><strong>2. 錄取方式：</strong></p>
            <ul className="list-[lower-alpha] pl-6 space-y-1">
              <li>錄取通知：錄取者將於 <strong>6 月 6 日</strong>透過您的 E-MAIL 發送錄取通知（提交報名表單不代表已錄取）。</li>
              <li>錄取條件：收到錄取通知後，須於 <strong>6 月 15 日台北時間晚上 8 時前</strong>匯款／刷卡繳交食宿、場地及交通等費用，並至台灣四念處學會網站填寫匯款／刷卡資料，才算完成正式錄取。</li>
              <li>錄取情況：正式錄取者，將建立 Line 及微信群組。</li>
              <li>實體禪修場地條件有限，如報名學員較多，將無法全部錄取，最終錄取方法與結果由課程組決定。</li>
            </ul>
            <p><strong>3. 如果被課程組認為不適合再繼續參加本次課程，需完全配合課程組的決定。</strong></p>
          </div>
        </div>

        {/* 第一題 */}
        <div className={sectionClass}>
          <label className={labelClass}>1. 您是否願意承諾如實填寫本次的報名表單？*</label>
          <select className={inputClass} value={form.honest_confirm}
            onChange={e => update('honest_confirm', e.target.value)}>
            <option value="">請選擇</option>
            <option value="yes">是</option>
            <option value="no">否（將結束報名）</option>
          </select>
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
            <select className={inputClass} value={form.attended_formal}
              onChange={e => update('attended_formal', e.target.value)}>
              <option value="">請選擇</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </div>

          {/* 課程選擇（Q3–Q8，依 PDF 規格） */}
          {[
            { no: 3, title: '泰國四念處禪修課程', loc: '泰國·線下實體', courses: THAILAND_COURSES },
            { no: 4, title: '馬來西亞四念處禪修課程', loc: '馬來西亞·線下實體', courses: MALAYSIA_COURSES },
            { no: 5, title: '《解苦心鑰》讀者交流會', loc: '中國成都·線下實體', courses: CHENGDU_COURSES },
            { no: 6, title: '台灣四念處禪修課程', loc: '台灣·線下實體', courses: TAIWAN_COURSES },
            { no: 7, title: '新加坡四念處禪修課程', loc: '新加坡·線下實體', courses: SINGAPORE_COURSES },
            { no: 8, title: '遠程（線上）四念處禪修課程', loc: 'Zoom·線上網路', courses: ONLINE_COURSES },
          ].map(({ no, title, loc, courses }) => (
            <div key={title}>
              <label className={labelClass}>{no}. {title}（{loc}）（非必選題）</label>
              <div className="grid grid-cols-2 gap-2">
                {courses.map(course => (
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
            <select className={inputClass} value={form.watched_recordings}
              onChange={e => update('watched_recordings', e.target.value)}>
              <option value="">請選擇</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>10. 您是否透過ZOOM的方式，獲得阿姜巴山、阿姜納、阿姜松、阿姜妮或阿姜沃伊做一對一的禪修指導？*</label>
            <select className={inputClass} value={form.zoom_guidance}
              onChange={e => update('zoom_guidance', e.target.value)}>
              <option value="">請選擇</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>11. 是否觀看/聆聽過隆波帕默尊者法談開示30篇以上？*</label>
            <select className={inputClass} value={form.watched_30_talks}
              onChange={e => update('watched_30_talks', e.target.value)}>
              <option value="">請選擇</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>12. 您是否持守五戒？*</label>
            <select className={inputClass} value={form.keep_precepts}
              onChange={e => update('keep_precepts', e.target.value)}>
              <option value="">請選擇</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
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
              <option value="commit_from_now">未曾持續練習，但承諾自即日起每日練習 30 分鐘至 1 小時，持續至課程結束</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>15. 實體禪修課程之食宿、場地及交通等費用需由學員自行負擔，並請於 6 月 15 日前完成匯款或刷卡支付。請問您是否可於期限內完成付款？*</label>
            <select className={inputClass} value={form.pay_confirm}
              onChange={e => update('pay_confirm', e.target.value)}>
              <option value="">請選擇</option>
              <option value="yes">是，我願意按時全額支付</option>
              <option value="no">否</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>16. 您是否身體健康，能夠全程獨立參與？*</label>
            <select className={inputClass} value={form.health_confirm}
              onChange={e => update('health_confirm', e.target.value)}>
              <option value="">請選擇</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
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
              <label className={labelClass}>22. 法名（僅出家師父填寫）</label>
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
            <label className={labelClass}>27. 手機號碼*（海外人士請加國際碼，例如：台灣886+）</label>
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
    <p className="text-sm text-gray-600">請擇一填寫通訊軟體，並上傳對應的 QR Code（檔案上限 500KB）</p>
    <div>
      <label className="flex items-center gap-2 cursor-pointer text-black mb-1">
        <input type="radio" name="contact_app" value="line"
          checked={form.contact_app === 'line'}
          onChange={() => update('contact_app', 'line')} />
        LINE
      </label>
      {form.contact_app === 'line' && (
        <div className="space-y-2 pl-6">
          <input className={inputClass} placeholder="請填寫 LINE ID *"
            value={form.line_id}
            onChange={e => update('line_id', e.target.value)} />
          <div>
            <label htmlFor="qr-line" className="text-sm text-gray-700 block mb-1 font-semibold">LINE QR Code 圖片 *</label>
            {form.line_qr_url && (
              <img src={form.line_qr_url} alt="LINE QR"
                className="mb-2 w-32 h-32 object-contain border rounded" />
            )}
            <label htmlFor="qr-line"
              className={`block w-full border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors ${
                uploadingQr === 'line'
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                  : form.line_qr_url
                  ? 'border-green-400 bg-green-50 hover:bg-green-100 text-green-800'
                  : 'border-green-500 bg-white hover:bg-green-50 text-green-800'
              }`}>
              {uploadingQr === 'line' ? (
                <><div className="text-2xl mb-1">⏳</div><div className="text-sm">上傳中...</div></>
              ) : (
                <><div className="text-2xl mb-1">📤</div>
                  <div className="text-sm font-semibold">
                    {form.line_qr_url ? '點此重新上傳 LINE QR' : '點此選擇 LINE QR Code 圖片'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">JPG / PNG / WEBP（500KB 以下）</div>
                </>
              )}
              <input id="qr-line" type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingQr === 'line'}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload('line', f) }} />
            </label>
          </div>
        </div>
      )}
    </div>
    <div>
      <label className="flex items-center gap-2 cursor-pointer text-black mb-1">
        <input type="radio" name="contact_app" value="wechat"
          checked={form.contact_app === 'wechat'}
          onChange={() => update('contact_app', 'wechat')} />
        微信（WeChat）
      </label>
      {form.contact_app === 'wechat' && (
        <div className="space-y-2 pl-6">
          <input className={inputClass} placeholder="請填寫微信號 *"
            value={form.wechat_id}
            onChange={e => update('wechat_id', e.target.value)} />
          <div>
            <label htmlFor="qr-wechat" className="text-sm text-gray-700 block mb-1 font-semibold">微信二維碼圖片 *</label>
            {form.wechat_qr_url && (
              <img src={form.wechat_qr_url} alt="WeChat QR"
                className="mb-2 w-32 h-32 object-contain border rounded" />
            )}
            <label htmlFor="qr-wechat"
              className={`block w-full border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors ${
                uploadingQr === 'wechat'
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                  : form.wechat_qr_url
                  ? 'border-green-400 bg-green-50 hover:bg-green-100 text-green-800'
                  : 'border-green-500 bg-white hover:bg-green-50 text-green-800'
              }`}>
              {uploadingQr === 'wechat' ? (
                <><div className="text-2xl mb-1">⏳</div><div className="text-sm">上傳中...</div></>
              ) : (
                <><div className="text-2xl mb-1">📤</div>
                  <div className="text-sm font-semibold">
                    {form.wechat_qr_url ? '點此重新上傳 微信 QR' : '點此選擇微信二維碼圖片'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">JPG / PNG / WEBP（500KB 以下）</div>
                </>
              )}
              <input id="qr-wechat" type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingQr === 'wechat'}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload('wechat', f) }} />
            </label>
          </div>
        </div>
      )}
    </div>
  </div>
</div>
        </div>

        {/* 費用說明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-semibold text-yellow-800">8/20–8/24 禪修期間之食宿、交通及場地費用</h3>
          <p className="text-yellow-700 mt-2"><strong>NT$18,600 元整</strong></p>
          <p className="text-sm text-yellow-700 mt-1">（如需提前或延後住宿，將另計相關費用）</p>
          <p className="text-sm text-yellow-600 mt-2">錄取後將提供專屬繳費碼，請於 6 月 15 日前完成繳費。</p>
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

        {/* 結尾 */}
        <div className="text-center space-y-3 pt-6">
          <p className="text-green-800 font-medium">報名表填寫結束，感謝您的報名！</p>
          <p className="text-gray-600 text-sm">隨喜功德</p>
          <p className="text-green-800 font-semibold">台灣四念處學會 合十</p>
          <img src="/logo.webp" alt="台灣四念處學會"
            className="mx-auto w-32 h-auto opacity-90"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        </div>
      </div>
    </div>
  )
}