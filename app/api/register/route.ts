import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, generateRandomCode } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 產生唯一隨機碼
    let randomCode = ''
    let isUnique = false
    while (!isUnique) {
      randomCode = generateRandomCode()
      const { data } = await supabaseAdmin
        .from('registrations')
        .select('random_code')
        .eq('random_code', randomCode)
        .single()
      if (!data) isUnique = true
    }

    // 檢查 email 是否已報名
    const { data: existing } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('email', body.email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '此 Email 已經報名過了' },
        { status: 400 }
      )
    }

    // 寫入資料庫
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .insert({
        random_code: randomCode,
        chinese_name: body.chinese_name,
        passport_name: body.passport_name,
        identity: body.identity,
        dharma_name: body.dharma_name || null,
        gender: body.gender,
        age: parseInt(body.age),
        passport_country: body.passport_country || null,
        residence: body.residence,
        phone: body.phone,
        email: body.email,
        line_id: body.line_id || null,
        wechat_id: body.wechat_id || null,
        honest_confirm: body.honest_confirm,
        attended_formal: body.attended_formal,
        watched_recordings: body.watched_recordings,
        zoom_guidance: body.zoom_guidance,
        watched_30_talks: body.watched_30_talks,
        keep_precepts: body.keep_precepts,
        practice_years: body.practice_years,
        practice_frequency: body.practice_frequency,
        pay_confirm: body.pay_confirm,
        health_confirm: body.health_confirm,
        mental_health_note: body.mental_health_note || null,
        attended_courses: body.attended_courses || [],
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: '報名成功！請等待錄取通知',
      random_code: randomCode,
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '報名失敗，請稍後再試' },
      { status: 500 }
    )
  }
}