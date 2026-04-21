import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'

Font.register({
  family: 'NotoSansTC',
  src: 'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Regular.otf',
})
Font.register({
  family: 'NotoSansTC-Bold',
  src: 'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Bold.otf',
})

const styles = StyleSheet.create({
  page: { fontFamily: 'NotoSansTC', fontSize: 10, padding: 36, color: '#222', lineHeight: 1.5 },
  title: { fontFamily: 'NotoSansTC-Bold', fontSize: 16, color: '#2d6a4f', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 10, color: '#666', textAlign: 'center', marginBottom: 12 },
  h2: { fontFamily: 'NotoSansTC-Bold', fontSize: 12, color: '#2d6a4f', marginTop: 10, marginBottom: 4 },
  para: { marginBottom: 4 },
  bold: { fontFamily: 'NotoSansTC-Bold' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  cellHead: { fontFamily: 'NotoSansTC-Bold', width: '30%', backgroundColor: '#f0f7f4', padding: 3 },
  cell: { padding: 3, width: '70%' },
})

type Row = [string, any]
const F = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v))

export interface FormalNotifData {
  chinese_name: string
  passport_name: string | null
  member_id: string | null     // T-xxx 序號（錄取自動）
  student_id: string | null    // R-xxx 學號（食宿管理手動）
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

function Table({ rows }: { rows: Row[] }) {
  return (
    <View>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.row}>
          <Text style={styles.cellHead}>{k}</Text>
          <Text style={styles.cell}>{F(v)}</Text>
        </View>
      ))}
    </View>
  )
}

function FormalNotifDoc({ reg }: { reg: FormalNotifData }) {
  const l = reg.lodging || {}
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>第二屆台灣四念處禪修課程</Text>
        <Text style={styles.subtitle}>正式學員通知（個人資料總表）</Text>

        <Text style={styles.h2}>一、學員資料</Text>
        <Table rows={[
          ['學號', reg.student_id],
          ['序號', reg.member_id],
          ['中文姓名', reg.chinese_name],
          ['護照英文姓名', reg.passport_name],
          ['性別', reg.gender === 'male' ? '男' : reg.gender === 'female' ? '女' : reg.gender],
          ['法名', reg.dharma_name],
          ['居住地', reg.residence],
          ['電話', reg.phone],
          ['Email', reg.email],
          ['繳費方案', reg.payment_plan],
          ['繳費狀態', reg.payment_status === 'verified' ? '已確認' : reg.payment_status === 'paid' ? '待確認' : '未繳費'],
        ]} />

        <Text style={styles.h2}>二、食宿登記內容</Text>
        <Table rows={[
          ['入住 / 離開', l.arrival_date && l.departure_date ? `${l.arrival_date} / ${l.departure_date}` : null],
          ['繳費方式', l.payment_method === 'transfer' ? '匯款' : l.payment_method === 'credit_card' ? '刷卡' : l.payment_method],
          ['前往方式', TRANSPORT_ZH[l.arrival_transport] || l.arrival_transport],
          ['離開方式', (l.departure_transport === 'bus' ? '主辦專車' : '自行') + (l.bus_destination ? `（${BUS_DEST_ZH[l.bus_destination] || l.bus_destination}）` : '')],
          ['飲食', `${l.diet === 'meat' ? '葷食' : '素食'}　${l.noon_fasting === 'before_noon' ? '12 前吃' : '12 後吃'}`],
          ['茶點', l.snacks === 'snacks_and_drink' ? '茶點 + 咖啡/茶' : '只咖啡/茶'],
          ['8/19 晚餐', l.dinner_0819 ? '是' : '否'],
          ['8/24 晚餐', l.dinner_0824 ? '是' : '否'],
          ['打鼾', l.snoring ? '會' : '不會'],
          ['緊急聯絡人', l.emergency_name ? `${l.emergency_name}（${l.emergency_relation}）${l.emergency_phone}` : null],
          ['航班 抵台', l.flight_arrival_date ? `${l.flight_arrival_date} ${l.flight_arrival_time || ''}` : null],
          ['航班 離台', l.flight_departure_date ? `${l.flight_departure_date} ${l.flight_departure_time || ''}` : null],
        ]} />

        <Text style={styles.h2}>三、證件檢核</Text>
        <Table rows={[
          ['個人相片', l.photo_url ? '已上傳' : '未上傳'],
          ['身分證正面', l.id_front_url ? '已上傳' : '未上傳'],
          ['身分證反面', l.id_back_url ? '已上傳' : '未上傳'],
          ['護照', l.passport_url ? '已上傳' : '未上傳'],
          ['來台機票', l.arrival_ticket_url ? '已上傳' : '（非必填）'],
          ['離台機票', l.departure_ticket_url ? '已上傳' : '（非必填）'],
          ['8/17 快篩', l.test_0817_url ? '已上傳' : '未上傳'],
          ['8/19 快篩', l.test_0819_url ? '已上傳' : '未上傳'],
        ]} />

        <Text style={styles.h2}>四、課程注意事項</Text>
        <Text style={styles.para}>• 課程期間 8/20、8/22 快篩結果於現場繳交。</Text>
        <Text style={styles.para}>• 入住日月潭湖畔會館辦理入住時間：下午 3 點後；請攜帶身分證+健保卡（國內）或護照正本（國外）；自備雨具、盥洗用具、衣架。</Text>
        <Text style={styles.para}>• 課程全程配戴口罩、禁用手機、用餐禁語、全程佩戴學員證、未經同意禁止拍照錄影錄音。</Text>
        <Text style={styles.para}>• 若感冒確診須取消課程；若課程期間陽性，同寢室 4 人需房內隔離並改 ZOOM 上課。</Text>

        <Text style={{ marginTop: 16, fontSize: 9, color: '#666' }}>
          本通知內容依您所提交的報名表及食宿登記表產生。若資料有誤請儘速聯絡學會。
        </Text>
        <Text style={{ marginTop: 8, fontSize: 9, color: '#2d6a4f', textAlign: 'right' }}>
          台灣四念處學會 合十
        </Text>
      </Page>
    </Document>
  )
}

export async function buildFormalNotifPdf(reg: FormalNotifData): Promise<Buffer> {
  const stream: any = await pdf(<FormalNotifDoc reg={reg} />).toBlob()
  const arr = await stream.arrayBuffer()
  return Buffer.from(arr)
}
