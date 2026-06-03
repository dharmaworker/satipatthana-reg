import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMail, sendMailWithRetry } from '@/lib/mailer'
import { C, emailWrap, emailKicker, emailH1, emailH3, emailButton, emailCodeBox, emailSignoff, tableRow, tableWrap } from '@/lib/email-style'
import { copyForRegistration } from '@/lib/registration-period'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://satipatthana-reg-eihf.vercel.app'
const archiveEmail = process.env.ARCHIVE_EMAIL || 'satipatthana.taipei@gmail.com'

function yn(v: boolean | null | undefined) { return v ? '是' : '否' }
function q12Label(v: string | null | undefined) {
  if (v === 'yes') return '是'
  if (v === 'commit') return '承諾於 8/16 禪修前聽完 30 個法談'
  return '否'
}
function nullable(v: string | null | undefined) { return v || '—' }

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !reg) return NextResponse.json({ error: '查無此報名' }, { status: 404 })

  const isOnline = reg.retreat_format === 'online'
  const copy = copyForRegistration(reg)
  const courses = Array.isArray(reg.attended_courses) && reg.attended_courses.length
    ? reg.attended_courses.join('、') : '—'
  const formatLabel = isOnline ? '線上禪修（Zoom）' : '實體禪修'

  // 報名確認信
  const confirmBody = isOnline ? `
    ${emailKicker('Registration Received')}
    ${emailH1('已收到您的線上課程報名 🙏')}
    <p style="margin:0 0 12px;color:${C.inkSoft};">${reg.chinese_name} 法友您好，</p>
    <p style="margin:0 0 16px;color:${C.inkSoft};">感謝您報名「第二屆台灣四念處禪修線上課程（Zoom）」。我們已收到您的報名資料，以下是您的資訊：</p>
    ${emailCodeBox('您的專屬專屬碼', reg.random_code, '⚠ 請妥善保管，查詢報名狀態與登入學員專區時皆需使用。')}
    ${emailH3('接下來')}
    <ul style="font-size:13.5px;color:${C.inkSoft};line-height:1.95;padding-left:22px;margin:0;">
      <li>錄取通知：將於 <strong style="color:${C.ink};">${copy.notifyLabel}</strong> 由本信箱寄出</li>
      <li>課程方式：<strong style="color:${C.ink};">線上 Zoom 視訊</strong></li>
      <li>課程日期：<strong style="color:${C.ink};">2026/08/20 ～ 08/24</strong></li>
      <li>Zoom 連結及課程時程將於錄取後另行通知</li>
    </ul>
    ${emailH3('查詢報名狀態 / 學員專區')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">您可隨時透過下方連結進入學員專區查詢審核狀態：</p>
    ${emailButton(`${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`, '前往學員專區', 'green')}
    <p style="margin-top:10px;font-size:12.5px;color:${C.inkMute};">此連結為您的專屬連結，請妥善保管。如需重新登入請至 <a href="${baseUrl}/member" style="color:${C.green};">${baseUrl}/member</a> 並輸入 Email + 專屬碼。</p>
    ${emailSignoff()}
    <p style="color:${C.inkMute};font-size:12px;margin:6px 0 0;">若您沒有報名本課程，請忽略此信。</p>
  ` : `
    ${emailKicker('Registration Received')}
    ${emailH1('已收到您的實體課程報名 🙏')}
    <p style="margin:0 0 12px;color:${C.inkSoft};">${reg.chinese_name} 法友您好，</p>
    <p style="margin:0 0 16px;color:${C.inkSoft};">感謝您報名「第二屆台灣四念處禪修實體課程」。我們已收到您的報名資料，以下是您的資訊：</p>
    ${emailCodeBox('您的專屬專屬碼', reg.random_code, '⚠ 請妥善保管，查詢報名狀態與登入學員專區時皆需使用。')}
    ${emailH3('接下來')}
    <ul style="font-size:13.5px;color:${C.inkSoft};line-height:1.95;padding-left:22px;margin:0;">
      <li>錄取通知：將於 <strong style="color:${C.ink};">${copy.notifyLabel}</strong> 由本信箱寄出</li>
      <li>若錄取，請於 <strong style="color:${C.ink};">${copy.payDeadlineFull} 晚上 8 點前</strong>完成繳費</li>
      <li>課程日期：<strong style="color:${C.ink};">2026/08/20 ～ 08/24</strong>（南投日月潭湖畔會館）</li>
    </ul>
    ${emailH3('查詢報名狀態 / 學員專區')}
    <p style="font-size:13.5px;color:${C.inkSoft};margin:0 0 12px;">您可隨時透過下方連結進入學員專區查詢審核狀態，錄取後在同一頁面完成繳費、食宿登記、快篩上傳：</p>
    ${emailButton(`${baseUrl}/member/dashboard?id=${reg.id}&code=${reg.random_code}`, '前往學員專區', 'green')}
    <p style="margin-top:10px;font-size:12.5px;color:${C.inkMute};">此連結為您的專屬連結，請妥善保管。如需重新登入請至 <a href="${baseUrl}/member" style="color:${C.green};">${baseUrl}/member</a> 並輸入 Email + 專屬碼。</p>
    ${emailSignoff()}
    <p style="color:${C.inkMute};font-size:12px;margin:6px 0 0;">若您沒有報名本課程，請忽略此信。</p>
  `

  // 備存信
  const archiveBody = `
    ${emailKicker('Registration Archive · Resend')}
    ${emailH1(`補寄備存（${formatLabel}）`)}
    <p style="color:${C.inkMute};font-size:13px;margin:0 0 16px;">本信由後台手動補寄，確認信已同步補寄至報名者信箱。</p>
    ${emailH3('基本資料')}
    ${tableWrap([
      tableRow('禪修形式', formatLabel),
      tableRow('專屬碼', reg.random_code),
      tableRow('報名時間', new Date(reg.created_at).toLocaleString('zh-TW')),
      tableRow('中文姓名', reg.chinese_name),
      tableRow('身分證／護照號碼', nullable(reg.id_number)),
      tableRow('護照英文名', reg.passport_name),
      tableRow('法名', nullable(reg.dharma_name)),
      tableRow('性別', reg.gender === 'male' ? '男' : '女'),
      tableRow('年齡', reg.age),
      tableRow('居住地', reg.residence),
      tableRow('手機', reg.phone),
      tableRow('Email', reg.email),
      tableRow('LINE ID', nullable(reg.line_id)),
      tableRow('WeChat ID', nullable(reg.wechat_id)),
      tableRow('LINE QR', reg.line_qr_url ? `<a href="${reg.line_qr_url}" style="color:${C.green};">查看</a>` : '—'),
      tableRow('WeChat QR', reg.wechat_qr_url ? `<a href="${reg.wechat_qr_url}" style="color:${C.green};">查看</a>` : '—'),
    ].join(''))}
    ${emailH3('報名條件')}
    ${tableWrap([
      tableRow('承諾如實填寫', yn(reg.honest_confirm)),
      tableRow('正式學員經驗', yn(reg.attended_formal)),
      tableRow('觀看錄影 3 屆以上', yn(reg.watched_recordings)),
      tableRow('Zoom 一對一指導', yn(reg.zoom_guidance)),
      tableRow('法談 30 篇以上', q12Label(reg.watched_30_talks)),
      tableRow('持守五戒', yn(reg.keep_precepts)),
      tableRow('過往參加課程', courses),
    ].join(''))}
    <p style="margin-top:24px;color:${C.inkMute};font-size:12px;">
      後台連結：<a href="${baseUrl}/admin/dashboard" style="color:${C.green};">${baseUrl}/admin/dashboard</a>
    </p>
  `

  try {
    await Promise.all([
      sendMailWithRetry({
        to: reg.email,
        subject: isOnline
          ? '【第二屆台灣四念處禪修】線上課程報名確認'
          : '【第二屆台灣四念處禪修】實體課程報名確認',
        html: emailWrap(confirmBody),
      }, { mailType: 'register_confirm' }),
      sendMail({
        to: archiveEmail,
        subject: `【補寄備存】${isOnline ? '線上' : '實體'} ${reg.chinese_name} / ${reg.random_code}`,
        html: emailWrap(archiveBody, { maxWidth: 720 }),
      }),
    ])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[resend-confirm] failed:', e)
    return NextResponse.json({ error: e.message || '寄送失敗' }, { status: 500 })
  }
}
