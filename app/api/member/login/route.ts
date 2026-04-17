import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, random_code } = await request.json()

    if (!email || !random_code) {
      return NextResponse.json({ error: '請輸入 Email 和繳費碼' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('random_code', random_code.toUpperCase().trim())
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '帳號或繳費碼錯誤' }, { status: 401 })
    }

    if (data.payment_status !== 'verified') {
      return NextResponse.json({ error: '您尚未完成繳費確認，無法進入學員專區' }, { status: 403 })
    }

    const response = NextResponse.json({
      success: true,
      name: data.chinese_name,
      member_id: data.member_id,
    })

    response.cookies.set('member_email', data.email, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
    })
    response.cookies.set('member_id', data.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: '登入失敗' }, { status: 500 })
  }
}