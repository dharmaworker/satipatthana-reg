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

    const { data: reg, error } = await supabaseAdmin
      .from('registrations')
      .select(
        'id, chinese_name, status, payment_status, member_id, student_id, random_code, residence, payment_plan, created_at'
      )
      .eq('email', email.toLowerCase().trim())
      .eq('random_code', random_code.toUpperCase().trim())
      .single()

    if (error || !reg) {
      return NextResponse.json(
        { error: '查無資料，請確認 Email 和繳費碼是否正確' },
        { status: 404 }
      )
    }

    // 食宿登記狀態
    const { data: lodging } = await supabaseAdmin
      .from('lodging_registrations')
      .select('id, created_at, updated_at, test_0817_url, test_0819_url')
      .eq('registration_id', reg.id)
      .maybeSingle()

    const statusMap: Record<string, string> = {
      pending: '審核中',
      approved: '已錄取',
      rejected: '未錄取',
    }
    const paymentMap: Record<string, string> = {
      unpaid: '尚未繳費',
      paid: '已繳費，待確認',
      verified: '繳費已確認',
    }

    // 食宿登記狀態：未填 / 已送出（可再改 1 次）/ 已修改過（鎖定）
    let lodgingStatus: 'none' | 'submitted_editable' | 'locked' = 'none'
    if (lodging) {
      lodgingStatus = lodging.updated_at !== lodging.created_at ? 'locked' : 'submitted_editable'
    }

    const testsUploaded = lodging
      ? Number(!!lodging.test_0817_url) + Number(!!lodging.test_0819_url)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        id: reg.id,
        random_code: reg.random_code,
        name: reg.chinese_name,
        residence: reg.residence,
        payment_plan: reg.payment_plan,
        status: statusMap[reg.status] || reg.status,
        status_raw: reg.status,
        payment_status: paymentMap[reg.payment_status] || reg.payment_status,
        payment_status_raw: reg.payment_status,
        member_id: reg.member_id || '待編號',
        student_id: reg.student_id || null,
        applied_at: new Date(reg.created_at).toLocaleDateString('zh-TW'),
        lodging_status: lodgingStatus,
        tests_uploaded: testsUploaded,
        tests_total: 2,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: '查詢失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
