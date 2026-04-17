export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">費用說明與支付方式</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-green-800">費用方案</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-green-50">
                <th className="text-left px-3 py-2 text-black font-medium">方案</th>
                <th className="text-left px-3 py-2 text-black font-medium">說明</th>
                <th className="text-right px-3 py-2 text-black font-medium">金額(NT$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ['A(1)', '8/20-8/24 食宿等費用（匯款）', '18,600'],
                ['A(2)', '8/20-8/24 食宿等費用（刷卡）', '19,300'],
                ['B(1)', '8/19-8/24 食宿費用（匯款）', '20,350'],
                ['B(2)', '8/19-8/24 食宿費用（刷卡）', '21,050'],
                ['C(1)', '8/19+8/25 食宿等費用（匯款）', '22,590'],
                ['C(2)', '8/19+8/25 食宿等費用（刷卡）', '23,290'],
                ['D(1)', '8/20-8/25 食宿等費用（匯款）', '20,840'],
                ['D(2)', '8/20-8/25 食宿等費用（刷卡）', '21,540'],
              ].map(([plan, desc, amount]) => (
                <tr key={plan}>
                  <td className="px-3 py-2 text-black font-medium">{plan}</td>
                  <td className="px-3 py-2 text-black">{desc}</td>
                  <td className="px-3 py-2 text-black text-right">{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-green-800">支付方式</h2>
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="font-semibold text-green-800 mb-2">匯款（台灣法友）</p>
              <div className="text-black text-sm space-y-1">
                <p>戶名：台灣四念處學會</p>
                <p>銀行：第一銀行 仁和分行</p>
                <p>代號：007</p>
                <p className="text-lg font-bold tracking-wider">帳號：16510068750</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="font-semibold text-blue-800 mb-2">匯款（國外法友）</p>
              <div className="text-black text-sm space-y-1">
                <p>戶名：台灣四念處學會</p>
                <p>銀行：第一銀行 仁和分行</p>
                <p>代號：007</p>
                <p className="text-lg font-bold tracking-wider">帳號：16540016022</p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="font-semibold text-yellow-800 mb-2">信用卡刷卡</p>
              <p className="text-black text-sm">收到錄取通知後，點擊信件中的「前往繳費」按鈕，選擇刷卡方案即可線上刷卡。</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-1">
          <p>⚠️ 請於 2026年6月15日晚上8時前完成繳費</p>
          <p>⚠️ 一旦繳費後取消報名，已付費用恕無法退款或轉讓</p>
        </div>

        <a href="/member/dashboard" className="block text-center text-green-700 hover:text-green-800">
          ← 返回課程資訊總覽
        </a>
      </div>
    </div>
  )
}