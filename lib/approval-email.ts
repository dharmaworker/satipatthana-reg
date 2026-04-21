import { sendMail } from './mailer'
import { buildApprovalPdf } from './approval-pdf'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

export async function sendApprovalEmail(reg: {
  id: string
  email: string
  chinese_name: string
  random_code: string
  member_id: string | null
}) {
  // 產生 PDF 附件（失敗不影響 email 本體）
  let attachments: { filename: string; content: Buffer; contentType?: string }[] | undefined
  try {
    const pdfBuf = await buildApprovalPdf({
      chinese_name: reg.chinese_name,
      member_id: reg.member_id,
      random_code: reg.random_code,
    })
    attachments = [{
      filename: `錄取通知_${reg.chinese_name}_${reg.random_code}.pdf`,
      content: pdfBuf,
      contentType: 'application/pdf',
    }]
  } catch (pdfErr) {
    console.error('[approval-email] PDF 產生失敗，改為純 html:', pdfErr)
  }

  return sendMail({
    to: reg.email,
    bcc: archiveEmail,
    subject: '【第二屆台灣四念處禪修】錄取通知',
    attachments,
    html: `
      <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; color: #222;">
        <h2 style="color: #2d6a4f;">第二屆台灣四念處禪修課程－錄取通知</h2>
        <p>${reg.chinese_name} 法友您好：</p>
        <p>恭喜您被錄取成為「第二屆台灣四念處禪修課程」學員，您的暫時學員編號為 <strong>${reg.member_id || '待編號'}</strong>。</p>

        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">

        <h3 style="color: #2d6a4f;">一、請詳讀以下內容</h3>
        <p>本信包含：繳費資訊、費用方案、食宿登記、快篩檢測、住宿安排、報到時間、課程時間、結束時間、禪修課程群組、承諾事宜、海外入境須知、航班建議等。請務必逐項閱讀。</p>

        <h3 style="color: #2d6a4f;">二、繳費 / 食宿登記 / 快篩上傳</h3>
        <p>以下三個流程<strong>可獨立進行、不需依序</strong>，請依各自截止時間完成：</p>

        <p style="margin-top:14px;"><strong>① 繳費</strong>　截止：<strong>6 月 15 日台北時間晚上 8 時前</strong></p>
        <a href="${baseUrl}/pay?id=${reg.id}&code=${reg.random_code}"
          style="display:inline-block;background:#2d6a4f;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:6px 0;">
          前往繳費
        </a>
        <p style="font-size:13px;color:#c0392b;margin-top:6px;">⚠️ 匯款／轉帳前請慎重考慮！由於飯店條款限制，學會已先代墊食宿等費用，一旦繳費後取消報名，已付的食宿等費用皆無法退款、轉讓。</p>

        <p style="margin-top:14px;"><strong>② 食宿登記</strong>　截止：<strong>6 月 20 日晚上 8 點前</strong></p>
        <a href="${baseUrl}/lodging?id=${reg.id}&code=${reg.random_code}"
          style="display:inline-block;background:#1a5276;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:6px 0;">
          前往食宿登記
        </a>
        <p style="font-size:13px;color:#c0392b;margin-top:6px;">⚠️ 填寫緊急聯絡人、飲食、交通、證件等資料。<strong>本表單送出後僅能再修改 1 次（共計 2 次送出機會），請務必確認後再送出。</strong></p>

        <p style="margin-top:14px;"><strong>③ 快篩檢測上傳</strong>　依各時段截止：</p>
        <a href="${baseUrl}/quicktests?id=${reg.id}&code=${reg.random_code}"
          style="display:inline-block;background:#8e44ad;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:6px 0;">
          前往上傳快篩
        </a>
        <p style="font-size:13px;color:#666;margin-top:6px;">
          ・8/17 上午 8 點至晚上 8 點前　・8/19 上午 12 點前<br>
          （課程期間 8/20、8/22 快篩結果<strong>現場繳交</strong>，不需線上上傳）<br>
          檢測結果需載明日期、學號、姓名；快篩試劑請自備。
        </p>

        <h4 style="color:#2d6a4f;margin-top:16px;">費用方案</h4>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
            <tr style="background:#f0f7f4;">
            <th style="border:1px solid #ccc;padding:8px;text-align:left;">方案</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:left;">說明</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:right;">金額(NT$)</th>
            </tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">A(1)</td><td style="border:1px solid #ccc;padding:8px;">8/20-8/24 食宿等費用（匯款）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">18,600</td></tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">A(2)</td><td style="border:1px solid #ccc;padding:8px;">8/20-8/24 食宿等費用（刷卡）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">19,300</td></tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">B(1)</td><td style="border:1px solid #ccc;padding:8px;">8/19-8/24 食宿費用（匯款）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">20,350</td></tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">B(2)</td><td style="border:1px solid #ccc;padding:8px;">8/19-8/24 食宿費用（刷卡）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">21,050</td></tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">C(1)</td><td style="border:1px solid #ccc;padding:8px;">8/19+8/25 食宿等費用（匯款）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">22,590</td></tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">C(2)</td><td style="border:1px solid #ccc;padding:8px;">8/19+8/25 食宿等費用（刷卡）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">23,290</td></tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">D(1)</td><td style="border:1px solid #ccc;padding:8px;">8/20-8/25 食宿等費用（匯款）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">20,840</td></tr>
            <tr><td style="border:1px solid #ccc;padding:8px;">D(2)</td><td style="border:1px solid #ccc;padding:8px;">8/20-8/25 食宿等費用（刷卡）</td><td style="border:1px solid #ccc;padding:8px;text-align:right;">21,540</td></tr>
        </table>

        <h3 style="color: #2d6a4f;">匯款帳號（選擇匯款方案請使用）</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#f0f7f4;">
            <th style="border:1px solid #ccc;padding:8px;text-align:left;width:90px;">對象</th>
            <th style="border:1px solid #ccc;padding:8px;text-align:left;">帳戶資訊</th>
          </tr>
          <tr>
            <td style="border:1px solid #ccc;padding:8px;">台灣法友</td>
            <td style="border:1px solid #ccc;padding:8px;">
              戶名：台灣四念處學會<br>
              銀行：第一銀行 仁和分行（代號 007）<br>
              帳號：<strong>16510068750</strong>
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #ccc;padding:8px;">國外法友</td>
            <td style="border:1px solid #ccc;padding:8px;">
              戶名：台灣四念處學會<br>
              銀行：第一銀行 仁和分行（代號 007）<br>
              帳號：<strong>16540016022</strong>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:#c0392b;margin-top:8px;">⚠️ 匯款時請備註姓名與繳費碼：<strong style="letter-spacing:3px;">${reg.random_code}</strong>，並於上方「前往繳費」頁面回填匯款後五碼。</p>

        <h3 style="color: #2d6a4f;">三、住宿安排</h3>
        <ol style="font-size:14px;line-height:1.7;">
          <li>房間皆為四人房，採單獨床位配置，附兩套衛浴。</li>
          <li>如需安排兩人一間，請先私訊向主辦單位確認房間數量是否足夠；經確認後，每人需補差額新台幣 <strong>7,000 至 9,000 元</strong>。</li>
        </ol>

        <h3 style="color: #2d6a4f;">四、報到時間及地點</h3>
        <p>時間：2026年8月19日上午10點（台北時間）<br>
        場地：日月潭湖畔會館<br>
        地址：南投縣魚池鄉日月村中正路101號</p>

        <h3 style="color: #2d6a4f;">五、課程時間</h3>
        <p>2026年8月20日至8月24日，共5天</p>

        <h3 style="color: #2d6a4f;">六、結束時間</h3>
        <p>2026年8月24日下午5點30分（可選擇當日離營或25日上午9點30分前離營）</p>

        <h3 style="color: #2d6a4f;">七、食宿登記</h3>
        <p>請從本信第二段「② 前往食宿登記」連結進入填寫，截止時間為 6/20 晚上 8 點。<strong>本表單送出後僅能再修改 1 次（共計 2 次送出機會），請務必確認後再送出。</strong></p>

        <h3 style="color: #2d6a4f;">八、禪修課程群組</h3>
        <p>資料經確認無誤後，學會將以學員所提供之 LINE 或微信，邀請您加入 <strong>8 月禪修課程群組</strong>。</p>

        <h3 style="color: #2d6a4f;">九、承諾事項</h3>
        <ol type="a" style="font-size:14px;line-height:1.7;">
          <li>請遵從指導老師的課程安排指導及主辦方的規定。課程期間將全程進行拍攝與錄音，作為法佈施；學員需接受出鏡，並在課後不要求刪減個人互動的相關音視頻。</li>
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

        <h3 style="color: #2d6a4f;">十、海外入境須知</h3>
        <p>請進入中華民國移民署查詢：<a href="https://www.immigration.gov.tw/">https://www.immigration.gov.tw/</a></p>

        <h3 style="color: #2d6a4f;">十一、航班建議</h3>
        <p><strong>a. 來台抵達時間</strong></p>
        <ul style="font-size:14px;line-height:1.7;margin-top:0;">
          <li>建議抵達：8 月 19 日下午 2:00 至 2:30 以前（台北時間）。</li>
          <li>集合地點：桃園國際機場（TPE）第一航廈，完成入境並領取行李後，請至出關後右側服務台前集合。</li>
          <li>行程安排：現場將由法工人員接機，並統一搭乘專車前往日月潭湖畔會館。</li>
        </ul>
        <p><strong>b. 離台時間</strong></p>
        <ul style="font-size:14px;line-height:1.7;margin-top:0;">
          <li>專車出發：8 月 25 日上午 9:00（台北時間）自會館準時發車。</li>
          <li>預計抵達：預計於下午 2:00 至 3:00 抵達桃園國際機場第一航廈。</li>
        </ul>

        <h3 style="color: #2d6a4f;">十二、主辦單位保有課程變更、異動之權利</h3>
        <p>如有任何爭議，台灣四念處學會將保留最終決定權。</p>

        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;font-weight:bold;">您的專屬繳費碼：</p>
            <p style="font-size:28px;font-weight:bold;color:#2d6a4f;letter-spacing:4px;margin:10px 0;">${reg.random_code}</p>
            <p style="margin:0;font-size:13px;color:#666;">查詢報名狀態時需使用此碼</p>
        </div>
        <div style="background:#e8f4f8;padding:15px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;font-weight:bold;color:#1a5276;">📋 學員查詢系統</p>
          <p style="margin:10px 0 5px;">繳費完成後，您可以透過以下連結查詢報名狀態及學號：</p>
          <a href="${baseUrl}/query"
            style="display:inline-block;background:#1a5276;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:5px 0;">
            查詢報名狀態與學號
          </a>
          <p style="margin:10px 0 0;font-size:13px;color:#666;">查詢時需輸入您的 Email 及繳費專屬碼：<strong>${reg.random_code}</strong></p>
        </div>
        <p style="color:#666;font-size:13px;">如有任何問題，請聯繫台灣四念處學會。</p>
        <p style="color:#666;font-size:13px;">台灣四念處學會 合十</p>
      </div>
    `,
  })
}
