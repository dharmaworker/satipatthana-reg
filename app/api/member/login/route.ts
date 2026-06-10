import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, random_code, password } = await request.json()

    if (!email) {
      return NextResponse.json({ error: '請輸入 Email' }, { status: 400 })
    }

    // --- 密碼登入 ---
    if (password !== undefined) {
      if (!password) return NextResponse.json({ error: '請輸入密碼' }, { status: 400 })

      const { data, error } = await supabaseAdmin
        .from('registrations')
        .select('id, chinese_name, member_id, random_code, member_password, phone')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (error || !data) {
        return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
      }

      // 有效密碼：member_password 優先，否則用手機末4碼
      const phone = data.phone?.trim() ?? ''
      if (!data.member_password && phone.length < 4) {
        return NextResponse.json(
          { error: '您的帳號尚未設定密碼，且手機號碼未填或不足4碼，請改用專屬代碼登入' },
          { status: 401 }
        )
      }
      const effectivePassword = data.member_password ?? phone.slice(-4)

      if (password !== effectivePassword) {
        return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
      }

      return NextResponse.json({
        success: true,
        id: data.id,
        code: data.random_code,
        name: data.chinese_name,
        member_id: data.member_id,
      })
    }

    // --- 專屬代碼登入（原有邏輯）---
    if (!random_code) {
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
  } catch {
    return NextResponse.json({ error: '登入失敗' }, { status: 500 })
  }
}
