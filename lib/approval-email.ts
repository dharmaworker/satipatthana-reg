import { sendMail } from './mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailH4, emailButton, emailWarning, emailHighlight, emailCodeBox, emailSignoff } from './email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export async function sendApprovalEmail(reg: {
  id: string
  email: string
  chinese_name: string
  random_code: string
  member_id: string | null
  retreat_format?: string | null
}) {
  if (reg.retreat_format === 'online') {
    const onlineBody = `
      ${emailKicker('Approval Notice')}
      ${emailH1('第二屆台灣四念處禪修課程－線上錄取通知')}
      <p style="margin:0 0 12px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
      <p style="margin:0 0 16px;color:${C.inkSoft};">恭喜您被錄取成為「第二屆台灣四念處禪修線上課程（Zoom）」學員，您的報名序號為 <strong style="color:${C.green};">${reg.member_id || '待編號'}</strong>。</p>

      ${emailH3('一、課程資訊')}
      <ul style="font-size:13.5px;color:${C.inkSoft};line-height:1.85;padding-left:22px;margin:0;">
        <li>課程方式：<strong style="color:${C.ink};">線上 Zoom 視訊</strong></li>
        <li>課程日期：<strong style="color:${C.ink};">2026/08/20（四）— 08/24（一）</strong></li>
        <li>Zoom 連結及課程時程將於開課前另行寄信通知。</li>
      </ul>

      ${emailH3('二、學員專區')}
      <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">您可透過學員專區查看課程時間表及審核狀態：</p>
      ${emailButton(`${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`, '進入學員專區', 'green')}
      <p style="margin:10px 0 0;font-size:12.5px;color:${C.inkMute};">此連結為您的專屬連結，請妥善保管。如需重新登入請至 <a href="${baseUrl}/member" style="color:${C.green};">${baseUrl}/member</a> 並輸入 Email + 專屬碼：<strong style="color:${C.ink};">${reg.random_code}</strong></p>

      <p style="color:${C.inkMute};font-size:13px;margin-top:18px;">如有任何問題請聯絡學會。</p>
      ${emailSignoff()}
    `
    return sendMail({
      to: reg.email,
      bcc: archiveEmail,
      subject: '【第二屆台灣四念處禪修】線上課程錄取通知',
      html: emailWrap(onlineBody, { maxWidth: 680 }),
    })
  }

  const tableTd = `padding:8px 10px;border:1px solid ${C.line};font-size:13.5px;`
  const tableTdMute = `padding:8px 10px;border:1px solid ${C.line};font-size:13.5px;background:rgba(73,85,52,0.04);color:${C.inkMute};font-weight:600;`

  const body = `
    ${emailKicker('Approval Notice')}
    ${emailH1('第二屆台灣四念處禪修課程－實體課程錄取通知')}
    <p style="margin:0 0 12px;color:${C.inkSoft};">${reg.chinese_name} 法友您好：</p>
    <p style="margin:0 0 16px;color:${C.inkSoft};">恭喜您被錄取成為「第二屆台灣四念處禪修<strong style="color:${C.ink};">實體課程</strong>」學員，您的報名序號為 <strong style="color:${C.green};">${reg.member_id || '待編號'}</strong>。</p>

    ${emailH3('一、請詳讀以下內容')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;">本信包含：繳費資訊、費用方案、食宿登記、快篩檢測、承諾書、住宿安排、報到時間、課程時間、結束時間、禪修課程群組、承諾事宜、海外入境須知、航班建議等。請務必逐項閱讀。</p>

    ${emailH3('二、繳費 / 食宿登記 / 快篩 / 承諾書')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 14px;">以下流程<strong style="color:${C.ink};">可獨立進行、不需依序</strong>。前三項為線上完成，第四項為下載列印後<strong style="color:${C.ink};">現場繳交</strong>。<strong style="color:${C.ink};">互動報名</strong>將另行寄信通知開放時間。</p>

    <p style="margin:14px 0 4px;font-size:14px;"><strong style="color:${C.green};">① 繳費</strong>　截止：<strong>6 月 15 日台北時間晚上 8 時前</strong></p>
    ${emailButton(`${baseUrl}/pay?id=${reg.id}&code=${reg.random_code}`, '前往繳費', 'green')}
    ${emailWarning('匯款／轉帳前請慎重考慮！由於飯店條款限制，學會已先代墊食宿等費用，一旦繳費後取消報名，已付的食宿等費用皆無法退款、轉讓。感謝您的諒解及配合！')}

    <p style="margin:18px 0 4px;font-size:14px;"><strong style="color:${C.green};">② 食宿登記</strong>　截止：<strong>6 月 20 日晚上 8 點前</strong></p>
    ${emailButton(`${baseUrl}/lodging?id=${reg.id}&code=${reg.random_code}`, '前往食宿登記', 'green')}
    ${emailWarning('填寫緊急聯絡人、飲食、交通、證件等資料。<strong>本表單送出後僅能再修改 1 次（共計 2 次送出機會），請務必確認後再送出。</strong>')}

    <p style="margin:18px 0 4px;font-size:14px;"><strong style="color:${C.green};">③ 快篩檢測上傳</strong>　依各時段截止：</p>
    ${emailButton(`${baseUrl}/quicktests?id=${reg.id}&code=${reg.random_code}`, '前往上傳快篩', 'gold')}
    <p style="font-size:13px;color:${C.inkMute};margin:6px 0 0;line-height:1.85;">
      ・8/17 上午 8 點至晚上 8 點前　・8/19 上午 12 點前<br>
      （課程期間 8/20、8/22 快篩結果<strong>現場繳交</strong>，不需線上上傳）<br>
      檢測結果需載明日期、報名序號、姓名；快篩試劑請自備。
    </p>

    <p style="margin:18px 0 4px;font-size:14px;"><strong style="color:${C.goldDeep};">④ 承諾書</strong>　現場繳交（不需線上送出）</p>
    ${emailButton(`${baseUrl}/api/pledge?id=${reg.id}&code=${reg.random_code}`, '下載承諾書 (Word)', 'gold')}
    ${emailWarning('請下載列印並<strong>親筆簽名</strong>，於 8/19 報到當日交給現場法工。本文件不需線上送出，但<strong>未繳交承諾書恕無法入營</strong>。')}

    ${emailH4('費用方案')}
    <table style="border-collapse:collapse;width:100%;font-size:13.5px;background:${C.bgPure};border-radius:10px;overflow:hidden;">
      <tr style="background:rgba(73,85,52,0.08);">
        <th style="${tableTd};text-align:left;font-weight:700;color:${C.ink};">方案</th>
        <th style="${tableTd};text-align:left;font-weight:700;color:${C.ink};">說明</th>
        <th style="${tableTd};text-align:right;font-weight:700;color:${C.ink};">金額(NT$)</th>
      </tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">A(1)</td><td style="${tableTd}">8/20-8/24 食宿等費用（匯款）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">18,600</td></tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">A(2)</td><td style="${tableTd}">8/20-8/24 食宿等費用（刷卡）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">19,300</td></tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">B(1)</td><td style="${tableTd}">8/19-8/24 食宿費用（匯款）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">20,350</td></tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">B(2)</td><td style="${tableTd}">8/19-8/24 食宿費用（刷卡）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">21,050</td></tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">C(1)</td><td style="${tableTd}">8/19 — 8/25 食宿等費用（匯款）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">22,590</td></tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">C(2)</td><td style="${tableTd}">8/19 — 8/25 食宿等費用（刷卡）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">23,290</td></tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">D(1)</td><td style="${tableTd}">8/20-8/25 食宿等費用（匯款）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">20,840</td></tr>
      <tr><td style="${tableTd};font-weight:700;color:${C.goldDeep};">D(2)</td><td style="${tableTd}">8/20-8/25 食宿等費用（刷卡）</td><td style="${tableTd};text-align:right;font-weight:700;color:${C.greenDeep};">21,540</td></tr>
    </table>

    ${emailH3('匯款帳號（選擇匯款方案請使用）')}
    <table style="border-collapse:collapse;width:100%;font-size:13.5px;background:${C.bgPure};border-radius:10px;overflow:hidden;">
      <tr style="background:rgba(73,85,52,0.08);">
        <th style="${tableTd};text-align:left;width:90px;font-weight:700;color:${C.ink};">對象</th>
        <th style="${tableTd};text-align:left;font-weight:700;color:${C.ink};">帳戶資訊</th>
      </tr>
      <tr>
        <td style="${tableTdMute}">台灣法友</td>
        <td style="${tableTd}">
          戶名：台灣四念處學會<br>
          銀行：第一銀行 仁和分行（代號 007）<br>
          帳號：<strong style="color:${C.green};letter-spacing:0.05em;">16510068750</strong>
        </td>
      </tr>
      <tr>
        <td style="${tableTdMute}">國外法友</td>
        <td style="${tableTd}">
          戶名：台灣四念處學會<br>
          銀行：第一銀行 仁和分行（代號 007）<br>
          帳號：<strong style="color:${C.green};letter-spacing:0.05em;">16540016022</strong>
        </td>
      </tr>
    </table>
    ${emailWarning(`匯款時請備註姓名與專屬碼：<strong style="letter-spacing:3px;">${reg.random_code}</strong>，並於上方「前往繳費」頁面回填匯款後五碼。`)}

    ${emailH3('三、住宿安排')}
    <ol style="font-size:13.5px;color:${C.inkSoft};line-height:1.85;padding-left:22px;margin:0;">
      <li>房間皆為四人房，採單獨床位配置，附兩套衛浴。</li>
      <li>如需安排兩人一間，請先私訊向主辦單位確認房間數量是否足夠；經確認後，每人需補差額新台幣 <strong style="color:${C.ink};">7,000 至 9,000 元</strong>。</li>
    </ol>

    ${emailH3('四、報到時間及地點')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;line-height:1.85;">時間：2026年8月19日上午10點（台北時間）<br>
    場地：日月潭湖畔會館<br>
    地址：南投縣魚池鄉日月村中正路101號</p>

    ${emailH3('五、課程時間')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;">2026年8月20日至8月24日，共5天</p>

    ${emailH3('六、結束時間')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;">2026年8月24日下午5點30分（可選擇當日離營或25日上午9點30分前離營）</p>

    ${emailH3('七、食宿登記')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;">請從本信第二段「② 前往食宿登記」連結進入填寫，截止時間為 6/20 晚上 8 點。<strong style="color:${C.ink};">本表單送出後僅能再修改 1 次（共計 2 次送出機會），請務必確認後再送出。</strong></p>

    ${emailH3('八、禪修課程群組')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;">資料經確認無誤後，學會將會以學員所提供之 LINE 或微信進入學會 <strong style="color:${C.ink};">8 月禪修課程群組</strong>。</p>

    ${emailH3('九、承諾事項')}
    <ol type="a" style="font-size:13px;color:${C.inkSoft};line-height:1.85;padding-left:22px;margin:0;">
      <li>請遵從指導老師的課程安排指導及主辦方的規定。課程期間將全程進行拍攝與錄音，作為法佈施；學員需接受出鏡，並在課後不要求刪減個人互動的相關影音視頻。</li>
      <li>用餐時間，禁語。</li>
      <li>請務必全程佩戴學員證。</li>
      <li>課程期間請遵守作息時間，勿遲到早退，影響他人。</li>
      <li>課程期間不可使用通訊軟體、手機。為示尊重，未獲得老師許可，上課中請勿拍照、攝影或錄音。</li>
      <li>請輕聲細語，勿打擾他人禪修。</li>
      <li>為護持禪眾修行與隱私保護，未經同意不得外傳任何資訊。</li>
      <li>因故無法參加，請提早告知，俾利主辦方作業處理，恕無法退還已繳費用。</li>
      <li>禪修期間，必須全程參加課程，勿遲到早退，私人事務請事先安排妥當。若課程開始當日無故不到，又未告知者，將影響下次報名資格。</li>
      <li>主辦單位不提供禪修課程之外的其他服務，如：安排家屬住宿、安排旅遊、安排課程後的參學等。</li>
      <li>除颱風、天災或不可抗拒之因素，禪修課程照常舉辦。</li>
    </ol>

    ${emailH3('十、海外入境須知')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;">請進入中華民國移民署中文網查詢相關資訊：<a href="https://www.immigration.gov.tw/" style="color:${C.green};">https://www.immigration.gov.tw/</a></p>

    ${emailH3('十一、航班建議')}
    <p style="font-size:13.5px;color:${C.ink};margin:0 0 4px;"><strong>a. 來台抵達時間</strong></p>
    <ul style="font-size:13px;color:${C.inkSoft};line-height:1.85;padding-left:22px;margin:0 0 12px;">
      <li>建議抵達：8 月 19 日下午 2:00 至 2:30 以前（台北時間）。</li>
      <li>集合地點：桃園國際機場（TPE）第一航廈，完成入境並領取行李後，請至出關後右側服務台前集合。</li>
      <li>行程安排：現場將由法工人員接機，並統一搭乘專車前往日月潭湖畔會館。</li>
    </ul>
    <p style="font-size:13.5px;color:${C.ink};margin:0 0 4px;"><strong>b. 離台時間</strong></p>
    <ul style="font-size:13px;color:${C.inkSoft};line-height:1.85;padding-left:22px;margin:0;">
      <li>專車出發：8 月 25 日上午 9:00（台北時間）自會館準時發車。</li>
      <li>預計抵達：預計於下午 2:00 至 3:00 抵達桃園國際機場第一航廈。</li>
    </ul>

    ${emailH3('十二、主辦單位保有課程變更、異動之權利')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0;">如有任何爭議，台灣四念處學會將保留最終決定權。</p>

    ${emailCodeBox('您的專屬專屬碼', reg.random_code, '查詢報名狀態時需使用此碼')}

    ${emailHighlight(`
      <p style="margin:0;font-weight:700;color:${C.greenDeep};font-size:14px;">📋 學員專區</p>
      <p style="margin:8px 0 10px;font-size:13.5px;color:${C.inkSoft};">點擊下方連結直接進入您的學員專區，查看繳費、食宿登記與快篩上傳進度：</p>
      ${emailButton(`${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`, '進入學員專區', 'green')}
      <p style="margin:10px 0 0;font-size:12.5px;color:${C.inkMute};">此連結為您的專屬連結，請妥善保管。如需重新登入請至 <a href="${baseUrl}/member" style="color:${C.green};">${baseUrl}/member</a> 並輸入 Email + 專屬碼：<strong style="color:${C.ink};">${reg.random_code}</strong></p>
    `)}

    ${emailSignoff()}
  `

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】實體課程錄取通知',
    html: emailWrap(body, { maxWidth: 680 }),
  })
}
