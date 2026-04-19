'use client'
export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-6xl mb-4">🙏</div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">報名成功！</h1>
        <p className="text-gray-600 mb-6">
          感謝您報名第二屆台灣四念處禪修課程。<br />
          系統已將報名資訊發送至您的電子信箱，請注意查收（包括垃圾郵件）。
        </p>
        <div className="bg-green-50 rounded-xl p-4 text-left space-y-2 text-sm text-green-800">
          <p>📅 錄取通知：將於 <strong>6月6日</strong> 透過 E-MAIL 發送</p>
          <p>💰 繳費期限：錄取後請於 <strong>6月15日</strong> 前完成繳費</p>
          <p>📍 課程時間：<strong>2026年8月20日～8月24日</strong></p>
        </div>
        <p className="mt-6 text-sm text-gray-500">台灣四念處學會 合十</p>
        <img src="/logo.webp" alt="台灣四念處學會"
          className="mx-auto mt-3 w-24 h-auto opacity-90"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
      </div>
    </div>
  )
}