import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (!role) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: '匯出失敗' }, { status: 500 })
  }

  const headers = [
    '報名時間', '學號', '繳費碼', '審核狀態', '繳費狀態', '繳費方案',
    '中文姓名', '護照英文姓名', '身份', '法名', '性別', '年齡',
    '護照頒發地', '居住地', '手機', 'Email', 'LINE ID', '微信號',
    'LINE QR 連結', 'WeChat QR 連結',
    '修習年資', '練習頻率', '心理健康備注',
    '是否正式學員', '觀看錄影', 'Zoom指導', '觀看法談30篇',
    '持守五戒', '同意繳費', '身體健康', '參加課程記錄'
  ]

  const planMap: Record<string, string> = {
    A1: 'A(1) 8/20-8/24 食宿等費用（匯款）',
    A2: 'A(2) 8/20-8/24 食宿等費用（刷卡）',
    B1: 'B(1) 8/19-8/24 食宿費用（匯款）',
    B2: 'B(2) 8/19-8/24 食宿費用（刷卡）',
    C1: 'C(1) 8/19+8/25 食宿等費用（匯款）',
    C2: 'C(2) 8/19+8/25 食宿等費用（刷卡）',
    D1: 'D(1) 8/20-8/25 食宿等費用（匯款）',
    D2: 'D(2) 8/20-8/25 食宿等費用（刷卡）',
    T1: '【測試】匯款 1 元',
    T2: '【測試】刷卡 30 元',
  }

  const statusMap: Record<string, string> = {
    pending: '審核中', approved: '已錄取', rejected: '未錄取'
  }
  const paymentMap: Record<string, string> = {
    unpaid: '未繳費', paid: '待確認', verified: '已確認'
  }

  const rows = data.map(r => [
    new Date(r.created_at).toLocaleString('zh-TW'),
    r.member_id || '',
    r.random_code,
    statusMap[r.status] || r.status,
    paymentMap[r.payment_status] || r.payment_status,
    r.payment_plan ? (planMap[r.payment_plan] || r.payment_plan) : '',
    r.chinese_name,
    r.passport_name,
    r.identity === 'lay' ? '在家人' : '僧眾',
    r.dharma_name || '',
    r.gender === 'male' ? '男' : '女',
    r.age,
    r.passport_country || '',
    r.residence,
    r.phone,
    r.email,
    r.line_id || '',
    r.wechat_id || '',
    r.line_qr_url || '',
    r.wechat_qr_url || '',
    r.practice_years || '',
    r.practice_frequency || '',
    r.mental_health_note || '',
    r.attended_formal ? '是' : '否',
    r.watched_recordings ? '是' : '否',
    r.zoom_guidance ? '是' : '否',
    r.watched_30_talks ? '是' : '否',
    r.keep_precepts ? '是' : '否',
    r.pay_confirm ? '是' : '否',
    r.health_confirm ? '是' : '否',
    Array.isArray(r.attended_courses) ? r.attended_courses.join('、') : '',
  ])

  // 組成 CSV
  const csvContent = [headers, ...rows]
    .map(row =>
      row.map(cell =>
        `"${String(cell).replace(/"/g, '""')}"`
      ).join(',')
    )
    .join('\n')

  // 加 BOM 讓 Excel 正確顯示中文
  const bom = '\uFEFF'
  const csv = bom + csvContent

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registrations_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}