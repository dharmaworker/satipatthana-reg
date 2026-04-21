import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'

// 註冊支援中文的字體（從 Google Fonts 下載，首次會快取）
Font.register({
  family: 'NotoSansTC',
  src: 'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Regular.otf',
})
Font.register({
  family: 'NotoSansTC-Bold',
  src: 'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Bold.otf',
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansTC',
    fontSize: 11,
    padding: 40,
    color: '#222',
    lineHeight: 1.5,
  },
  title: {
    fontFamily: 'NotoSansTC-Bold',
    fontSize: 18,
    color: '#2d6a4f',
    marginBottom: 12,
    textAlign: 'center',
  },
  h2: {
    fontFamily: 'NotoSansTC-Bold',
    fontSize: 13,
    color: '#2d6a4f',
    marginTop: 14,
    marginBottom: 6,
  },
  para: {
    marginBottom: 6,
  },
  bold: {
    fontFamily: 'NotoSansTC-Bold',
  },
  list: {
    marginLeft: 12,
  },
  listItem: {
    marginBottom: 4,
  },
  code: {
    fontFamily: 'NotoSansTC-Bold',
    fontSize: 20,
    color: '#2d6a4f',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  table: {
    width: '100%',
    marginTop: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cellHead: {
    fontFamily: 'NotoSansTC-Bold',
    width: '25%',
    backgroundColor: '#f0f7f4',
    padding: 4,
  },
  cell: {
    padding: 4,
    width: '25%',
  },
  cellRight: {
    padding: 4,
    width: '25%',
    textAlign: 'right',
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
})

const PLANS: [string, string, number][] = [
  ['A(1)', '8/20-8/24 食宿等費用（匯款）', 18600],
  ['A(2)', '8/20-8/24 食宿等費用（刷卡）', 19300],
  ['B(1)', '8/19-8/24 食宿費用（匯款）', 20350],
  ['B(2)', '8/19-8/24 食宿費用（刷卡）', 21050],
  ['C(1)', '8/19-8/25 食宿等費用（匯款）', 22590],
  ['C(2)', '8/19-8/25 食宿等費用（刷卡）', 23290],
  ['D(1)', '8/20-8/25 食宿等費用（匯款）', 20840],
  ['D(2)', '8/20-8/25 食宿等費用（刷卡）', 21540],
]

export async function buildApprovalPdf(reg: {
  chinese_name: string
  member_id: string | null
  random_code: string
}): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>第二屆台灣四念處禪修課程－錄取通知</Text>
        <Text style={styles.para}>{reg.chinese_name} 法友您好：</Text>
        <Text style={styles.para}>
          恭喜您被錄取成為「第二屆台灣四念處禪修課程」學員，您的序號為 <Text style={styles.bold}>{reg.member_id || '待編號'}</Text>。
        </Text>

        <Text style={styles.h2}>一、請詳讀以下內容</Text>
        <Text style={styles.para}>
          本信包含：繳費資訊、費用方案、住宿安排、報到時間、課程時間、結束時間、食宿登記、禪修課程群組、承諾事宜、海外入境須知、航班建議等。
        </Text>

        <Text style={styles.h2}>二、食宿登記與繳費</Text>
        <Text style={styles.para}>
          請先完成食宿登記（填寫飲食、交通、緊急聯絡人、證件等）。食宿登記截止：6 月 20 日晚上 8 點。<Text style={styles.bold}>本表單送出後僅能再修改 1 次（共計 2 次送出機會），請務必確認後再送出。</Text>
        </Text>
        <Text style={styles.para}>
          繳費截止：<Text style={styles.bold}>2026 年 6 月 15 日台北時間晚上 8 時前</Text>。
        </Text>
        <Text style={styles.para}>
          ※ 匯款／轉帳前請慎重考慮！由於飯店條款限制，學會已先代墊食宿等費用，一旦繳費後取消報名，已付的食宿等費用皆無法退款、轉讓。
        </Text>

        <Text style={styles.h2}>費用方案</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cellHead}>方案</Text>
            <Text style={{ ...styles.cellHead, width: '50%' }}>說明</Text>
            <Text style={{ ...styles.cellHead, textAlign: 'right' }}>金額 NT$</Text>
          </View>
          {PLANS.map(([id, desc, amt]) => (
            <View key={id} style={styles.row}>
              <Text style={styles.cell}>{id}</Text>
              <Text style={{ ...styles.cell, width: '50%' }}>{desc}</Text>
              <Text style={styles.cellRight}>{amt.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>匯款帳號（選擇匯款方案請使用）</Text>
        <Text style={styles.para}>
          <Text style={styles.bold}>台灣法友：</Text>
          第一銀行 仁和分行（代號 007），戶名：台灣四念處學會，帳號 <Text style={styles.bold}>16510068750</Text>
        </Text>
        <Text style={styles.para}>
          <Text style={styles.bold}>國外法友：</Text>
          第一銀行 仁和分行（代號 007），戶名：台灣四念處學會，帳號 <Text style={styles.bold}>16540016022</Text>
        </Text>
        <Text style={styles.para}>
          匯款時請備註姓名與繳費碼：<Text style={styles.bold}>{reg.random_code}</Text>。
        </Text>

        <Text style={styles.h2}>三、住宿安排</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>1. 房間皆為四人房，採單獨床位配置，附兩套衛浴。</Text>
          <Text style={styles.listItem}>2. 如需安排兩人一間，請先私訊向主辦單位確認房間數量是否足夠；經確認後，每人需補差額新台幣 7,000 至 9,000 元。</Text>
        </View>

        <Text style={styles.h2}>四、報到時間及地點</Text>
        <Text style={styles.para}>時間：2026 年 8 月 19 日上午 10 點（台北時間）</Text>
        <Text style={styles.para}>場地：日月潭湖畔會館</Text>
        <Text style={styles.para}>地址：南投縣魚池鄉日月村中正路 101 號</Text>

        <Text style={styles.h2}>五、課程時間</Text>
        <Text style={styles.para}>2026 年 8 月 20 日至 8 月 24 日，共 5 天</Text>

        <Text style={styles.h2}>六、結束時間</Text>
        <Text style={styles.para}>2026 年 8 月 24 日下午 5 點 30 分（可選擇當日離營或 25 日上午 9 點 30 分前離營）</Text>

        <Text style={styles.h2}>七、食宿登記</Text>
        <Text style={styles.para}>食宿登記表請於信中「前往食宿登記」連結完成；登記後會自動決定繳費方案，並寄確認信至您的信箱。</Text>

        <Text style={styles.h2}>八、禪修課程群組</Text>
        <Text style={styles.para}>資料經確認無誤後，學會將以學員所提供之 LINE 或微信，邀請您加入 8 月禪修課程群組。</Text>

        <Text style={styles.h2}>九、承諾事項</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>a. 請遵從指導老師的課程安排指導及主辦方的規定。課程期間將全程進行拍攝與錄音，作為法佈施；學員需接受出鏡，並在課後不要求刪減個人互動的相關音視頻。</Text>
          <Text style={styles.listItem}>b. 用餐時間，禁語。</Text>
          <Text style={styles.listItem}>c. 請務必全程佩戴學員證。</Text>
          <Text style={styles.listItem}>d. 課程期間請遵守作息時間，勿遲到早退，影響他人。</Text>
          <Text style={styles.listItem}>e. 課程期間不可使用通訊軟體、手機。未獲得老師許可，上課中請勿拍照、攝影或錄音。</Text>
          <Text style={styles.listItem}>f. 請輕聲細語，勿打擾他人禪修。</Text>
          <Text style={styles.listItem}>g. 為護持禪眾修行與隱私保護，未經同意不得外傳任何資訊。</Text>
          <Text style={styles.listItem}>h. 因故無法參加，請提早告知，俾利主辦方作業處理，恕無法退還已繳費用。</Text>
          <Text style={styles.listItem}>i. 禪修期間，必須全程參加課程，勿遲到早退，私人事務請事先安排妥當。若課程開始當日無故不到，又未告知者，將影響下次報名資格。</Text>
          <Text style={styles.listItem}>j. 主辦單位不提供禪修課程之外的其他服務，如：安排家屬住宿、安排旅遊、安排課程後的參學等。</Text>
          <Text style={styles.listItem}>k. 除颱風、天災或不可抗拒之因素，禪修課程照常舉辦。</Text>
        </View>

        <Text style={styles.h2}>十、海外入境須知</Text>
        <Text style={styles.para}>請進入中華民國移民署查詢：https://www.immigration.gov.tw/</Text>

        <Text style={styles.h2}>十一、航班建議</Text>
        <Text style={styles.para}><Text style={styles.bold}>a. 來台抵達時間</Text></Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• 建議抵達：8 月 19 日下午 2:00 至 2:30 以前（台北時間）。</Text>
          <Text style={styles.listItem}>• 集合地點：桃園國際機場（TPE）第一航廈，完成入境並領取行李後，請至出關後右側服務台前集合。</Text>
          <Text style={styles.listItem}>• 行程安排：現場將由法工人員接機，並統一搭乘專車前往日月潭湖畔會館。</Text>
        </View>
        <Text style={styles.para}><Text style={styles.bold}>b. 離台時間</Text></Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• 專車出發：8 月 25 日上午 9:00（台北時間）自會館準時發車。</Text>
          <Text style={styles.listItem}>• 預計抵達：預計於下午 2:00 至 3:00 抵達桃園國際機場第一航廈。</Text>
        </View>

        <Text style={styles.h2}>十二、主辦單位保有課程變更、異動之權利</Text>
        <Text style={styles.para}>如有任何爭議，台灣四念處學會將保留最終決定權。</Text>

        <Text style={styles.h2}>您的專屬繳費碼</Text>
        <Text style={styles.code}>{reg.random_code}</Text>

        <Text style={styles.footer}>台灣四念處學會 合十</Text>
      </Page>
    </Document>
  )

  const blob = await pdf(doc).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
