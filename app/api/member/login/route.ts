import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, random_code } = await request.json()

    if (!email || !random_code) {
      return NextResponse.json({ error: '請輸入 Email 和專屬碼' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select('id, chinese_name, member_id, random_code')
      .eq('email', email.toLowerCase().trim())
      .eq('random_code', random_code.toUpperCase().trim())
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '帳號或專屬碼錯誤' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      code: data.random_code,
      name: data.chinese_name,
      member_id: data.member_id,
    })
  } catch (error) {
    return NextResponse.json({ error: '登入失敗' }, { status: 500 })
  }
}
