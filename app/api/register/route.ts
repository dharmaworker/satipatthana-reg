import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, generateRandomCode } from '@/lib/supabase'
import { nextAvailableMemberId } from '@/lib/member-id'
import { sendMail } from '@/lib/mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailCodeBox, emailSignoff, tableRow, tableWrap } from '@/lib/email-style'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

// 截止：2026/05/25 晚上 24:00（台北時間）= UTC 5/25 16:00
const REG_CLOSE_MS = Date.UTC(2026, 4, 25, 16, 0, 0)

function yn(v: boolean | null | undefined) {
  return v ? '是' : '否'
}
function nullable(v: string | null | undefined) {
  return v || '—'
}

export async function POST(request: NextRequest) {
  try {
    // 截止日檢查
    const now = Date.now()
    if (now > REG_CLOSE_MS) {
      return NextResponse.json({ error: '報名已截止（2026/05/25 晚上 24 點止）' }, { status: 400 })
    }

    const body = await request.json()

    // 驗證通訊軟體：LINE 或 WeChat 擇一，選了就要填 ID + 上傳 QR
    if (body.contact_app === 'line') {
      if (!body.line_id || !body.line_qr_url) {
        return NextResponse.json({ error: '選擇 LINE 時必須填寫 LINE ID 並上傳 QR Code' }, { status: 400 })
      }
    } else if (body.contact_app === 'wechat') {
      if (!body.wechat_id || !body.wechat_qr_url) {
        return NextResponse.json({ error: '選擇 WeChat 時必須填寫微信號並上傳 QR Code' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: '請選擇 LINE 或 WeChat 作為通訊聯絡方式' }, { status: 400 })
    }

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

    // 產生報名序號（線上用 L-xxx，實體用 T-xxx）
    const memberId = await nextAvailableMemberId(body.retreat_format === 'online')

    // 寫入資料庫
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .insert({
        random_code: randomCode,
        member_id: memberId,
        chinese_name: body.chinese_name,
        id_number: body.id_number || null,
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
        line_qr_url: body.line_qr_url || null,
        wechat_qr_url: body.wechat_qr_url || null,
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
        retreat_format: body.retreat_format || null,
        attended_courses: body.attended_courses || [],
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select()
      .single()

    if (error) throw error

    const isOnline = data.retreat_format === 'online'

    // 寄報名確認信（失敗不影響報名結果）
    try {
      const confirmBody = isOnline ? `
        ${emailKicker('Registration Received')}
        ${emailH1('已收到您的線上課程報名 🙏')}
        <p style="margin:0 0 12px;color:${C.inkSoft};">${data.chinese_name} 法友您好，</p>
        <p style="margin:0 0 16px;color:${C.inkSoft};">感謝您報名「第二屆台灣四念處禪修線上課程（Zoom）」。我們已收到您的報名資料，以下是您的資訊：</p>

        ${emailCodeBox('您的專屬專屬碼', data.random_code, '⚠ 請妥善保管，查詢報名狀態與登入學員專區時皆需使用。')}

        ${emailH3('接下來')}
        <ul style="font-size:13.5px;color:${C.inkSoft};line-height:1.95;padding-left:22px;margin:0;">
          <li>錄取通知：將於 <strong style="color:${C.ink};">2026/06/06</strong> 由本信箱寄出</li>
          <li>課程方式：<strong style="color:${C.ink};">線上 Zoom 視訊</strong></li>
          <li>課程日期：<strong style="color:${C.ink};">2026/08/20 ～ 08/24</strong></li>
          <li>Zoom 連結及課程時程將於錄取後另行通知</li>
        </ul>

        ${emailH3('查詢報名狀態 / 學員專區')}
        <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">您可隨時透過下方連結進入學員專區查詢審核狀態：</p>
        ${emailButton(`${baseUrl}/member/dashboard?id=${data.id}&code=${data.random_code}`, '前往學員專區', 'green')}
        <p style="margin-top:10px;font-size:12.5px;color:${C.inkMute};">此連結為您的專屬連結，請妥善保管。如需重新登入請至 <a href="${baseUrl}/member" style="color:${C.green};">${baseUrl}/member</a> 並輸入 Email + 專屬碼。</p>

        ${emailSignoff()}
        <p style="color:${C.inkMute};font-size:12px;margin:6px 0 0;">若您沒有報名本課程，請忽略此信。</p>
      ` : `
        ${emailKicker('Registration Received')}
        ${emailH1('已收到您的實體課程報名 🙏')}
        <p style="margin:0 0 12px;color:${C.inkSoft};">${data.chinese_name} 法友您好，</p>
        <p style="margin:0 0 16px;color:${C.inkSoft};">感謝您報名「第二屆台灣四念處禪修實體課程」。我們已收到您的報名資料，以下是您的資訊：</p>

        ${emailCodeBox('您的專屬專屬碼', data.random_code, '⚠ 請妥善保管，查詢報名狀態與登入學員專區時皆需使用。')}

        ${emailH3('接下來')}
        <ul style="font-size:13.5px;color:${C.inkSoft};line-height:1.95;padding-left:22px;margin:0;">
          <li>錄取通知：將於 <strong style="color:${C.ink};">2026/06/06</strong> 由本信箱寄出</li>
          <li>若錄取，請於 <strong style="color:${C.ink};">2026/06/15 晚上 8 點前</strong>完成繳費</li>
          <li>課程日期：<strong style="color:${C.ink};">2026/08/20 ～ 08/24</strong>（南投日月潭湖畔會館）</li>
        </ul>

        ${emailH3('查詢報名狀態 / 學員專區')}
        <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">您可隨時透過下方連結進入學員專區查詢審核狀態，錄取後在同一頁面完成繳費、食宿登記、快篩上傳：</p>
        ${emailButton(`${baseUrl}/member/dashboard?id=${data.id}&code=${data.random_code}`, '前往學員專區', 'green')}
        <p style="margin-top:10px;font-size:12.5px;color:${C.inkMute};">此連結為您的專屬連結，請妥善保管。如需重新登入請至 <a href="${baseUrl}/member" style="color:${C.green};">${baseUrl}/member</a> 並輸入 Email + 專屬碼。</p>

        ${emailSignoff()}
        <p style="color:${C.inkMute};font-size:12px;margin:6px 0 0;">若您沒有報名本課程，請忽略此信。</p>
      `
      await sendMail({
        to: data.email,
        subject: isOnline
          ? '【第二屆台灣四念處禪修】線上課程報名確認'
          : '【第二屆台灣四念處禪修】實體課程報名確認',
        html: emailWrap(confirmBody),
      })
    } catch (mailErr) {
      console.error('[register] 確認信寄送失敗（不影響報名）:', mailErr)
    }

    // 寄備存信給學會信箱（失敗不影響報名結果）
    try {
      const courses = Array.isArray(data.attended_courses) && data.attended_courses.length
        ? data.attended_courses.join('、')
        : '—'
      const formatLabel = isOnline ? '線上禪修（Zoom）' : '實體禪修'

      const archiveBody = isOnline ? `
        ${emailKicker('Registration Archive · Online')}
        ${emailH1('新報名備存（線上課程）')}
        <p style="color:${C.inkMute};font-size:13px;margin:0 0 16px;">本信由系統自動寄出，供學會信箱備份資料之用。最新資料請以後台為準。</p>

        ${emailH3('基本資料')}
        ${tableWrap([
          tableRow('禪修形式', formatLabel),
          tableRow('專屬碼', data.random_code),
          tableRow('報名時間', new Date(data.created_at).toLocaleString('zh-TW')),
          tableRow('中文姓名', data.chinese_name),
          tableRow('身分證／護照號碼', data.id_number ?? '—'),
          tableRow('護照英文名', data.passport_name),
          tableRow('身分', data.identity === 'lay' ? '在家人' : '僧眾'),
          tableRow('法名', nullable(data.dharma_name)),
          tableRow('性別', data.gender === 'male' ? '男' : '女'),
          tableRow('年齡', data.age),
          tableRow('護照頒發地', nullable(data.passport_country)),
          tableRow('居住地', data.residence),
          tableRow('手機', data.phone),
          tableRow('Email', data.email),
          tableRow('LINE ID', nullable(data.line_id)),
          tableRow('WeChat ID', nullable(data.wechat_id)),
          tableRow('LINE QR', data.line_qr_url ? `<a href="${data.line_qr_url}" style="color:${C.green};">查看</a>` : '—'),
          tableRow('WeChat QR', data.wechat_qr_url ? `<a href="${data.wechat_qr_url}" style="color:${C.green};">查看</a>` : '—'),
        ].join(''))}

        ${emailH3('報名條件')}
        ${tableWrap([
          tableRow('承諾如實填寫', yn(data.honest_confirm)),
          tableRow('正式學員經驗', yn(data.attended_formal)),
          tableRow('觀看錄影 3 屆以上', yn(data.watched_recordings)),
          tableRow('Zoom 一對一指導', yn(data.zoom_guidance)),
          tableRow('法談 30 篇以上', yn(data.watched_30_talks)),
          tableRow('持守五戒', yn(data.keep_precepts)),
          tableRow('修習年資', nullable(data.practice_years)),
          tableRow('練習頻率', nullable(data.practice_frequency)),
          tableRow('心理健康備註', nullable(data.mental_health_note)),
          tableRow('過往參加課程', courses),
        ].join(''))}

        ${emailH3('狀態')}
        ${tableWrap([
          tableRow('審核狀態', data.status),
        ].join(''))}

        <p style="margin-top:24px;color:${C.inkMute};font-size:12px;">
          後台連結：<a href="${baseUrl}/admin/dashboard" style="color:${C.green};">${baseUrl}/admin/dashboard</a>
        </p>
      ` : `
        ${emailKicker('Registration Archive')}
        ${emailH1('新報名備存（實體課程）')}
        <p style="color:${C.inkMute};font-size:13px;margin:0 0 16px;">本信由系統自動寄出，供學會信箱備份資料之用。最新資料請以後台為準。</p>

        ${emailH3('基本資料')}
        ${tableWrap([
          tableRow('禪修形式', formatLabel),
          tableRow('專屬碼', data.random_code),
          tableRow('報名時間', new Date(data.created_at).toLocaleString('zh-TW')),
          tableRow('中文姓名', data.chinese_name),
          tableRow('身分證／護照號碼', data.id_number ?? '—'),
          tableRow('護照英文名', data.passport_name),
          tableRow('身分', data.identity === 'lay' ? '在家人' : '僧眾'),
          tableRow('法名', nullable(data.dharma_name)),
          tableRow('性別', data.gender === 'male' ? '男' : '女'),
          tableRow('年齡', data.age),
          tableRow('護照頒發地', nullable(data.passport_country)),
          tableRow('居住地', data.residence),
          tableRow('手機', data.phone),
          tableRow('Email', data.email),
          tableRow('LINE ID', nullable(data.line_id)),
          tableRow('WeChat ID', nullable(data.wechat_id)),
          tableRow('LINE QR', data.line_qr_url ? `<a href="${data.line_qr_url}" style="color:${C.green};">查看</a>` : '—'),
          tableRow('WeChat QR', data.wechat_qr_url ? `<a href="${data.wechat_qr_url}" style="color:${C.green};">查看</a>` : '—'),
        ].join(''))}

        ${emailH3('報名條件')}
        ${tableWrap([
          tableRow('承諾如實填寫', yn(data.honest_confirm)),
          tableRow('正式學員經驗', yn(data.attended_formal)),
          tableRow('觀看錄影 3 屆以上', yn(data.watched_recordings)),
          tableRow('Zoom 一對一指導', yn(data.zoom_guidance)),
          tableRow('法談 30 篇以上', yn(data.watched_30_talks)),
          tableRow('持守五戒', yn(data.keep_precepts)),
          tableRow('修習年資', nullable(data.practice_years)),
          tableRow('練習頻率', nullable(data.practice_frequency)),
          tableRow('同意繳費', yn(data.pay_confirm)),
          tableRow('身體健康能全程參與', yn(data.health_confirm)),
          tableRow('心理健康備註', nullable(data.mental_health_note)),
          tableRow('過往參加課程', courses),
        ].join(''))}

        ${emailH3('狀態')}
        ${tableWrap([
          tableRow('審核狀態', data.status),
          tableRow('繳費狀態', data.payment_status),
        ].join(''))}

        <p style="margin-top:24px;color:${C.inkMute};font-size:12px;">
          後台連結：<a href="${baseUrl}/admin/dashboard" style="color:${C.green};">${baseUrl}/admin/dashboard</a>
        </p>
      `

      await sendMail({
        to: archiveEmail,
        subject: `【報名備存】${isOnline ? '線上' : '實體'} ${data.chinese_name} / ${data.random_code}`,
        html: emailWrap(archiveBody, { maxWidth: 720 }),
      })
    } catch (archiveErr) {
      console.error('[register] 備存信寄送失敗（不影響報名）:', archiveErr)
    }

    return NextResponse.json({
      success: true,
      message: '報名成功！請等待錄取通知',
      id: data.id,
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