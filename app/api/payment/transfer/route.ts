import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { registration_id, last5, transfer_date, account_name } = await request.json()

    if (!registration_id || !last5 || !transfer_date) {
      return NextResponse.json({ error: '請填寫完整資訊' }, { status: 400 })
    }

    if (!/^\d{5}$/.test(last5)) {
      return NextResponse.json({ error: '後五碼請填寫5位數字' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('registrations')
      .update({
        payment_status: 'paid',
        payment_note: `匯款後五碼：${last5}｜匯款日期：${transfer_date}｜匯款人：${account_name || '未填'}`,
      })
      .eq('id', registration_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 })
  }
}