export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">課程時間與地點</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-green-800">課程資訊</h2>
          <div className="space-y-3 text-black">
            <div className="flex gap-3">
              <span className="text-green-700 font-medium w-20 shrink-0">課程時間</span>
              <span>2026年8月20日（四）至8月24日（一），共5天</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-700 font-medium w-20 shrink-0">報到時間</span>
              <span>2026年8月19日上午10點（台北時間）</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-700 font-medium w-20 shrink-0">結束時間</span>
              <span>8月24日下午5點30分（可選擇當日離營或25日上午9點30分前離營）</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-700 font-medium w-20 shrink-0">課程地點</span>
              <span>日月潭湖畔會館<br />南投縣魚池鄉日月村中正路101號</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-700 font-medium w-20 shrink-0">課程名額</span>
              <span>250名（額滿為止）</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-700 font-medium w-20 shrink-0">課程費用</span>
              <span>課程免費，食宿場地交通費用自理</span>
            </div>
          </div>
        </div>

        <a href="/member/dashboard" className="block text-center text-green-700 hover:text-green-800">
          ← 返回課程資訊總覽
        </a>
      </div>
    </div>
  )
}