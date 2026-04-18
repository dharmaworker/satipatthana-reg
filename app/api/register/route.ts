import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, generateRandomCode } from '@/lib/supabase'
import { sendMail } from '@/lib/mailer'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg.vercel.app'

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

    // 寄報名確認信（失敗不影響報名結果）
    try {
      await sendMail({
        to: data.email,
        subject: '【第二屆台灣四念處禪修】報名確認',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #222;">
            <h2 style="color: #2d6a4f;">已收到您的報名 🙏</h2>
            <p>${data.chinese_name} 法友您好，</p>
            <p>感謝您報名「第二屆台灣四念處禪修課程」。我們已收到您的報名資料，以下是您的資訊：</p>

            <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:20px 0;">
              <p style="margin:0;font-weight:bold;">您的專屬繳費碼：</p>
              <p style="font-size:28px;font-weight:bold;color:#2d6a4f;letter-spacing:4px;margin:10px 0;">${data.random_code}</p>
              <p style="margin:0;font-size:13px;color:#666;">⚠️ 請妥善保管，查詢報名狀態與登入學員專區時皆需使用。</p>
            </div>

            <h3 style="color:#2d6a4f;">接下來</h3>
            <ul style="line-height:1.8;">
              <li>錄取通知：將於 <strong>2026/06/06</strong> 由本信箱寄出</li>
              <li>若錄取，請於 <strong>2026/06/15 晚上 8 點前</strong>完成繳費</li>
              <li>課程日期：<strong>2026/08/20 ～ 08/24</strong>（南投日月潭湖畔會館）</li>
            </ul>

            <h3 style="color:#2d6a4f;">查詢報名狀態</h3>
            <p>您可隨時至下方連結查詢審核與繳費狀態：</p>
            <a href="${baseUrl}/query"
              style="display:inline-block;background:#1a5276;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              前往查詢
            </a>
            <p style="margin-top:10px;font-size:13px;color:#666;">查詢時需輸入您的 Email 及上方繳費碼。</p>

            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="color:#666;font-size:13px;">若您沒有報名本課程，請忽略此信。</p>
            <p style="color:#666;font-size:13px;">台灣四念處學會 合十</p>
          </div>
        `,
      })
    } catch (mailErr) {
      console.error('[register] 確認信寄送失敗（不影響報名）:', mailErr)
    }

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