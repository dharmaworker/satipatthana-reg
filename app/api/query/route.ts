import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, random_code } = await request.json()
    if (!email || !random_code) {
      return NextResponse.json({ error: '請輸入 Email 和繳費碼' }, { status: 400 })
    }

    const { data: reg, error } = await supabaseAdmin
      .from('registrations')
      .select('chinese_name, status, member_id')
      .eq('email', email.toLowerCase().trim())
      .eq('random_code', random_code.toUpperCase().trim())
      .single()

    if (error || !reg) {
      return NextResponse.json(
        { error: '查無資料，請確認 Email 和繳費碼是否正確' },
        { status: 404 }
      )
    }

    const statusMap: Record<string, string> = {
      pending: '審核中',
      approved: '已錄取',
      rejected: '未錄取',
    }

    return NextResponse.json({
      success: true,
      data: {
        name: reg.chinese_name,
        status: statusMap[reg.status] || reg.status,
        status_raw: reg.status,
        member_id: reg.member_id || '待編號',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: '查詢失敗，請稍後再試' }, { status: 500 })
  }
}
