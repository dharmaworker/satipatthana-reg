import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, random_code } = await request.json()

    if (!email || !random_code) {
      return NextResponse.json(
        { error: '請輸入 Email 和繳費碼' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select(
        'chinese_name, status, payment_status, member_id, random_code, created_at'
      )
      .eq('email', email.toLowerCase().trim())
      .eq('random_code', random_code.toUpperCase().trim())
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '查無資料，請確認 Email 和繳費碼是否正確' },
        { status: 404 }
      )
    }

    const statusMap: Record<string, string> = {
      pending: '審核中',
      approved: '已錄取，待繳費',
      rejected: '未錄取',
    }

    const paymentMap: Record<string, string> = {
      unpaid: '尚未繳費',
      paid: '已繳費，確認中',
      verified: '繳費確認完成',
    }

    return NextResponse.json({
      success: true,
      data: {
        name: data.chinese_name,
        status: statusMap[data.status] || data.status,
        payment_status: paymentMap[data.payment_status] || data.payment_status,
        member_id: data.member_id || '待編號',
        applied_at: new Date(data.created_at).toLocaleDateString('zh-TW'),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: '查詢失敗，請稍後再試' },
      { status: 500 }
    )
  }
}