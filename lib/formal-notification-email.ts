import { sendMail } from './mailer'

const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export interface FormalNotifData {
  chinese_name: string
  passport_name: string | null
  member_id: string | null
  student_id: string | null
  random_code: string
  email: string
  phone: string
  residence: string | null
  gender: string | null
  dharma_name: string | null
  payment_plan: string | null
  payment_status: string | null
  lodging: any
}

const TRANSPORT_ZH: Record<string, string> = {
  self: '8/19 自行抵達',
  taipei_bus: '主辦專車（8/19 台北車站）',
  wuri_bus: '主辦專車（8/19 烏日高鐵）',
  airport_bus_0819: '主辦專車（8/19 桃園機場）',
  self_0820: '8/20 自行抵達',
}
const BUS_DEST_ZH: Record<string, string> = {
  taipei_824_pm: '8/24 下午到台北車站',
  taipei_825_am: '8/25 上午到台北車站',
  wuri_825_am: '8/25 上午到烏日高鐵',
  taoyuan_824_pm: '8/24 下午到桃園機場',
  taoyuan_825_am: '8/25 上午到桃園機場',
}

const row = (label: string, value: string | number | null | undefined) =>
  `<tr><td style="padding:6px 10px;border:1px solid #eee;background:#f9f9f9;width:140px;">${label}</td><td style="padding:6px 10px;border:1px solid #eee;">${value ?? '—'}</td></tr>`

export async function sendFormalNotificationEmail(reg: FormalNotifData) {
  const l = reg.lodging || {}

  const genderZh = reg.gender === 'male' ? '男' : reg.gender === 'female' ? '女' : reg.gender
  const paymentStatusZh = reg.payment_status === 'verified' ? '已確認' : reg.payment_status === 'paid' ? '待確認' : '未繳費'
  const arrivalZh = TRANSPORT_ZH[l.arrival_transport] || l.arrival_transport || '—'
  const departureZh = (l.departure_transport === 'bus' ? '主辦專車' : '自行') +
    (l.bus_destination ? `（${BUS_DEST_ZH[l.bus_destination] || l.bus_destination}）` : '')
  const dietZh = l.diet === 'meat' ? '葷食' : l.diet === 'vegetarian' ? '素食' : '—'
  const noonZh = l.noon_fasting === 'before_noon' ? '12 前吃' : l.noon_fasting === 'after_noon' ? '12 後吃' : '—'
  const snacksZh = l.snacks === 'snacks_and_drink' ? '茶點 + 咖啡/茶' : l.snacks === 'drink_only' ? '只咖啡/茶' : '—'

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】正式學員通知',
    html: `
      <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; color: #222;">
        <h2 style="color:#2d6a4f;">第二屆台灣四念處禪修課程－正式學員通知</h2>
        <p>${reg.chinese_name} 法友您好：</p>
        <p>您已完成報名與食宿登記所有流程。以下為我們收到的完整資料，請您<strong>再次核對</strong>，若有誤請即刻聯絡學會：</p>

        <h3 style="color:#2d6a4f;">一、學員資料</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          ${row('學號', reg.student_id || '（未編號）')}
          ${row('中文姓名', reg.chinese_name)}
          ${row('護照英文姓名', reg.passport_name)}
          ${row('性別', genderZh)}
          ${reg.dharma_name ? row('法名', reg.dharma_name) : ''}
          ${row('居住地', reg.residence)}
          ${row('電話', reg.phone)}
          ${row('Email', reg.email)}
          ${row('繳費方案', reg.payment_plan || '—')}
          ${row('繳費狀態', paymentStatusZh)}
        </table>

        <h3 style="color:#2d6a4f;">二、食宿登記</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          ${row('入住 / 離開', l.arrival_date && l.departure_date ? `${l.arrival_date} / ${l.departure_date}` : '—')}
          ${row('前往方式', arrivalZh)}
          ${row('離開方式', departureZh)}
          ${row('飲食', `${dietZh}　${noonZh}`)}
          ${row('茶點', snacksZh)}
          ${row('8/19 晚餐', l.dinner_0819 ? '是' : '否')}
          ${row('8/24 晚餐', l.dinner_0824 ? '是' : '否')}
          ${row('打鼾', l.snoring ? '會' : '不會')}
          ${row('緊急聯絡人', l.emergency_name ? `${l.emergency_name}（${l.emergency_relation}）${l.emergency_phone}` : '—')}
          ${l.flight_arrival_date ? row('航班 抵台', `${l.flight_arrival_date} ${l.flight_arrival_time || ''}`) : ''}
          ${l.flight_departure_date ? row('航班 離台', `${l.flight_departure_date} ${l.flight_departure_time || ''}`) : ''}
        </table>

        <h3 style="color:#2d6a4f;">三、證件檢核</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          ${row('個人相片', l.photo_url ? '✅ 已上傳' : '❌ 未上傳')}
          ${row('身分證正面', l.id_front_url ? '✅ 已上傳' : '—')}
          ${row('身分證反面', l.id_back_url ? '✅ 已上傳' : '—')}
          ${row('護照', l.passport_url ? '✅ 已上傳' : '—')}
          ${row('ARC / 居留證', l.arc_url ? '✅ 已上傳' : '—')}
          ${row('來台機票', l.arrival_ticket_url ? '✅ 已上傳' : '（非必填）')}
          ${row('離台機票', l.departure_ticket_url ? '✅ 已上傳' : '（非必填）')}
          ${row('8/17 快篩', l.test_0817_url ? '✅ 已上傳' : '❌ 未上傳')}
          ${row('8/19 快篩', l.test_0819_url ? '✅ 已上傳' : '❌ 未上傳')}
        </table>

        <h3 style="color:#2d6a4f;">四、課程注意事項</h3>
        <ul style="font-size:14px;line-height:1.7;">
          <li>課程期間 <strong>8/20、8/22 快篩結果現場繳交</strong>，不需線上上傳。</li>
          <li>入住日月潭湖畔會館辦理入住時間：下午 3 點後；<strong style="color:#c0392b;">請攜帶身分證+健保卡（國內）或護照正本（國外）</strong>；自備雨具、盥洗用具、衣架。</li>
          <li>課程全程配戴口罩、禁用手機、用餐禁語、全程佩戴學員證、未經同意禁止拍照錄影錄音。</li>
          <li>若感冒確診須取消課程；若課程期間陽性，同寢室 4 人需房內隔離並改 ZOOM 上課。</li>
        </ul>

        <p style="color:#666;font-size:13px;margin-top:18px;">若資料有誤請儘速聯絡學會。</p>
        <p style="color:#2d6a4f;font-size:13px;margin-top:8px;">台灣四念處學會 合十</p>
      </div>
    `,
  })
}
