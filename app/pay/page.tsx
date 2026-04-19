'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const PLAN_INFO: Record<string, { label: string; amount: number }> = {
  A1: { label: 'A(1) 8/20-8/24 食宿等費用（匯款）', amount: 18600 },
  A2: { label: 'A(2) 8/20-8/24 食宿等費用（刷卡）', amount: 19300 },
  B1: { label: 'B(1) 8/19-8/24 食宿費用（匯款）', amount: 20350 },
  B2: { label: 'B(2) 8/19-8/24 食宿費用（刷卡）', amount: 21050 },
  C1: { label: 'C(1) 8/19-8/25 食宿等費用（匯款）', amount: 22590 },
  C2: { label: 'C(2) 8/19-8/25 食宿等費用（刷卡）', amount: 23290 },
  D1: { label: 'D(1) 8/20-8/25 食宿等費用（匯款）', amount: 20840 },
  D2: { label: 'D(2) 8/20-8/25 食宿等費用（刷卡）', amount: 21540 },
  T1: { label: '【測試】匯款 1 元', amount: 1 },
  T2: { label: '【測試】刷卡 30 元', amount: 30 },
}

function PayContent() {
  const searchParams = useSearchParams()
  const registration_id = searchParams.get('id') || ''
  const random_code = searchParams.get('code') || ''

  const [plan, setPlan] = useState('')
  const [loadingInit, setLoadingInit] = useState(true)
  const [initError, setInitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [error, setError] = useState('')

  // 進頁面時先抓 registration，確認 payment_plan 已由食宿登記帶入
  useEffect(() => {
    if (!registration_id || !random_code) {
      setInitError('網址缺少參數，請從錄取通知信進入')
      setLoadingInit(false)
      return
    }
    fetch(`/api/lodging?id=${registration_id}&code=${encodeURIComponent(random_code)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '載入失敗')
        if (data.registration?.payment_plan) {
          setPlan(data.registration.payment_plan)
        }
      })
      .catch(e => setInitError(e.message))
      .finally(() => setLoadingInit(false))
  }, [registration_id, random_code])

  const [transferForm, setTransferForm] = useState({
  last5: '',
  transfer_date: '',
  account_name: '',
  })
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferDone, setTransferDone] = useState(false)

  const handleTransferSubmit = async () => {
  setTransferLoading(true)
  setTransferError('')
  try {
    const res = await fetch('/api/payment/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_id,
        plan,
        last5: transferForm.last5,
        transfer_date: transferForm.transfer_date,
        account_name: transferForm.account_name,
      }),
    })
    const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTransferDone(true)
    } catch (err: any) {
      setTransferError(err.message)
    } finally {
      setTransferLoading(false)
    }
  }

  const selectedPlan = plan ? PLAN_INFO[plan] : null
  const isTransfer = ['A1', 'B1', 'C1', 'D1', 'T1'].includes(plan)

  const handlePay = async () => {
    if (!registration_id) {
      setError('找不到報名資料，請透過錄取通知信的連結進入')
      return
    }

    // 匯款方案直接顯示銀行帳號
    if (isTransfer) {
      setShowBank(true)
      return
    }

    // 刷卡方案導向綠界
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id, plan }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.location.href = url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (loadingInit) {
    return <div className="min-h-screen flex items-center justify-center">載入中...</div>
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md text-center">
          <p className="text-red-700">{initError}</p>
        </div>
      </div>
    )
  }

  // 沒有 payment_plan → 先導去食宿登記
  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center space-y-4">
          <div className="text-5xl">📝</div>
          <h2 className="text-xl font-bold text-green-800">請先完成食宿登記</h2>
          <p className="text-gray-700 text-sm">食宿方案將依登記內容自動帶入，完成後可返回此頁繳費。</p>
          <a href={`/lodging?id=${registration_id}&code=${encodeURIComponent(random_code)}`}
            className="inline-block bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-semibold">
            前往食宿登記
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">第二屆台灣四念處禪修</h1>
        <p className="mt-2 text-green-200">食宿費用繳費</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {random_code && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-sm text-green-700">您的繳費專屬碼</p>
            <p className="text-2xl font-bold text-green-800 tracking-widest mt-1">{random_code}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-green-800">您選擇的方案</h2>
          <p className="text-sm text-gray-600">以下方案由食宿登記自動帶入，如需變更請回到食宿登記修改。</p>
          <div className="p-3 rounded-lg border border-green-500 bg-green-50 flex items-center justify-between">
            <span className="text-black text-sm">{selectedPlan?.label}</span>
            <span className="font-semibold text-green-800">NT${selectedPlan?.amount.toLocaleString()}</span>
          </div>
          <a href={`/lodging?id=${registration_id}&code=${encodeURIComponent(random_code)}`}
            className="inline-block text-xs text-green-700 underline">
            修改食宿登記
          </a>
        </div>

        {selectedPlan && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-black font-medium">應付金額</span>
              <span className="text-2xl font-bold text-green-800">
                NT${selectedPlan.amount.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
          <p>⚠️ 一旦繳費後取消報名，已付費用恕無法退款或轉讓</p>
          <p>⚠️ 請於 2026年6月15日晚上8時前完成繳費</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl transition-colors text-lg">
          {loading ? '處理中...' : isTransfer ? '查看匯款帳號' : '前往綠界刷卡付款'}
        </button>

        {/* 匯款帳號顯示 */}
        {showBank && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-green-800">匯款帳號資訊</h2>

            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="font-semibold text-green-800 mb-2">台灣法友匯款</p>
                <div className="text-black text-sm space-y-1">
                  <p>戶名：台灣四念處學會</p>
                  <p>銀行：第一銀行 仁和分行</p>
                  <p>代號：007</p>
                  <p className="text-lg font-bold tracking-wider">帳號：16510068750</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-semibold text-blue-800 mb-2">國外法友匯款</p>
                <div className="text-black text-sm space-y-1">
                  <p>戶名：台灣四念處學會</p>
                  <p>銀行：第一銀行 仁和分行</p>
                  <p>代號：007</p>
                  <p className="text-lg font-bold tracking-wider">帳號：16540016022</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 space-y-1">
              <p>⚠️ 匯款時請備注您的姓名及繳費碼：<strong className="tracking-wider">{random_code}</strong></p>
              <p>⚠️ 匯款完成後請填寫下方資訊並截圖上傳至學會 LINE 官方帳號</p>
              <p>⚠️ 請於 2026年6月15日晚上8時前完成匯款</p>
            </div>

            {/* 匯款回報表單 */}
            {!transferDone ? (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-black">匯款完成後請填寫</h3>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    匯款帳號後五碼 *
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="請輸入5位數字"
                    value={transferForm.last5}
                    onChange={e => setTransferForm(prev => ({ ...prev, last5: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    匯款日期 *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={transferForm.transfer_date}
                    onChange={e => setTransferForm(prev => ({ ...prev, transfer_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    匯款人姓名
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="若與報名姓名不同請填寫"
                    value={transferForm.account_name}
                    onChange={e => setTransferForm(prev => ({ ...prev, account_name: e.target.value }))}
                  />
                </div>

                {transferError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {transferError}
                  </div>
                )}

                <button
                  onClick={handleTransferSubmit}
                  disabled={transferLoading}
                  className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl transition-colors">
                  {transferLoading ? '提交中...' : '確認提交匯款資訊'}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="font-semibold text-green-800">匯款資訊已提交！</p>
                <p className="text-sm text-green-700 mt-1">學會確認後將通知您完成正式錄取</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          刷卡交易由綠界科技處理，安全加密
        </p>
      </div>
    </div>
  )
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">載入中...</div>}>
      <PayContent />
    </Suspense>
  )
}