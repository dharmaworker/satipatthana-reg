import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMail } from '@/lib/mailer'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.tw@gmail.com'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  // 取得要寄信的學員
  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const results = []

  for (const reg of registrations) {
    try {
        await sendMail({
        to: reg.email,
        cc: archiveEmail,
        subject: '【第二屆台灣四念處禪修】錄取通知',
        html: `
        <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; color: #222;">
        <h2 style="color: #2d6a4f;">第二屆台灣四念處禪修課程－錄取通知</h2>
        <p>${reg.chinese_name} 法友您好：</p>
        <p>恭喜您被錄取成為「第二屆台灣四念處禪修課程」學員，您的暫時學員編號為 <strong>${reg.member_id || '待編號'}</strong>。</p>

        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">

        <h3 style="color: #2d6a4f;">一、繳費資訊</h3>
        <p>請於 <strong>2026年6月15日台北時間晚上8時前</strong>點擊下方按鈕選擇方案並完成繳費：</p>
        <a href="${baseUrl}/pay?id=${reg.id}&code=${reg.random_code}" 
          style="display:inline-block;background:#2d6a4f;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:10px 0;">
          前往繳費
        </a>
        
        <h3 style="color: #2d6a4f;">二、費用方案</h3>
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
        <p>房間皆為四人房，採單獨床位配置，附兩套衛浴。如需兩人一間，每人需補差額 NT$7,000（靜慮林師父免收）。</p>

        <h3 style="color: #2d6a4f;">四、報到時間及地點</h3>
        <p>時間：2026年8月19日上午10點（台北時間）<br>
        地點：日月潭湖畔會館<br>
        地址：南投縣魚池鄉日月村中正路101號</p>

        <h3 style="color: #2d6a4f;">五、課程時間</h3>
        <p>2026年8月20日至8月24日，共5天<br>
        結束時間：8月24日下午5點30分（可選擇當日離營或25日上午9點30分前離營）</p>

        <h3 style="color: #2d6a4f;">六、航班建議</h3>
        <p><strong>來台：</strong>建議8月19日下午2:00前抵達桃園國際機場第一航廈，法工人員接機，統一搭專車前往日月潭。</p>
        <p><strong>離台：</strong>8月25日上午9:00自會館發車，預計下午2:00-3:00抵達桃園機場第一航廈。</p>

        <h3 style="color: #2d6a4f;">七、承諾事項</h3>
        <ul style="font-size:14px;line-height:1.8;">
            <li>遵從指導老師課程安排及主辦方規定</li>
            <li>課程全程進行拍攝錄音，學員需接受出境</li>
            <li>用餐時間禁語</li>
            <li>全程佩戴學員證</li>
            <li>課程期間不可使用通訊軟體、手機</li>
            <li>輕聲細語，勿打擾他人禪修</li>
            <li>因故無法參加請提早告知，已繳費用恕無法退還</li>
        </ul>

        <h3 style="color: #2d6a4f;">八、海外入境須知</h3>
        <p>請至中華民國移民署查詢：<a href="https://www.immigration.gov.tw/">https://www.immigration.gov.tw/</a></p>

        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;font-weight:bold;">您的專屬繳費碼：</p>
            <p style="font-size:28px;font-weight:bold;color:#2d6a4f;letter-spacing:4px;margin:10px 0;">${reg.random_code}</p>
            <p style="margin:0;font-size:13px;color:#666;">查詢報名狀態時需使用此碼</p>
        </div>
        <div style="background:#e8f4f8;padding:15px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;font-weight:bold;color:#1a5276;">📋 學員查詢系統</p>
          <p style="margin:10px 0 5px;">繳費完成後，您可以透過以下連結查詢報名狀態及學號：</p>
          <a href="https://satipatthana-reg.vercel.app/query" 
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
      results.push({ id: reg.id, email: reg.email, success: true })
    } catch (err) {
      results.push({ id: reg.id, email: reg.email, success: false })
    }
  }

  const successCount = results.filter(r => r.success).length

  return NextResponse.json({
    success: true,
    message: `成功寄出 ${successCount} 封，失敗 ${results.length - successCount} 封`,
    results,
  })
}


// 舊的捐款頁面方式（暫時停用，之後可能恢復）
// <p>請於 <strong>2026年6月15日台北時間晚上8時前</strong>，至台灣四念處學會網站捐款頁面繳費：</p>
// <p><a href="https://satipatthana.org.tw/product/donation/">https://satipatthana.org.tw/product/donation/</a></p>
// <p>繳費時請注意：</p>
// <ul>
//     <li>用途選項：無，或填寫「第二屆禪修」</li>
//     <li>備註欄填寫：1. 8月禪修食宿等費用　2. 方案選項（例：方案一A(2)）</li>
//     <li>帳單姓名欄填寫：中文姓名＋暫時學號（例：王小明 ${reg.member_id || '001-T'}）</li>
// </ul>
// <p>⚠️ 繳費後請截圖上傳至學會 LINE 官方帳號，以利核對。</p>
// <p style="color:#c0392b;">⚠️ 一旦繳費後取消報名，已付費用恕無法退款或轉讓。</p>