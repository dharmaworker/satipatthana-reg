import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMailWithRetry } from '@/lib/mailer'
import { emailWrap, C, FONT } from '@/lib/email-style'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: '請填寫電子信箱' }, { status: 400 })
    }

    const { data } = await supabaseAdmin
      .from('registrations')
      .select('chinese_name, random_code')
      .eq('email', email.toLowerCase().trim())
      .single()

    // Always return success — don't reveal whether email exists
    if (!data) {
      return NextResponse.json({ ok: true })
    }

    const html = emailWrap(`
      <p style="font-size:15px;color:${C.inkSoft};margin:0 0 24px;">
        ${data.chinese_name} 法友您好：
      </p>
      <p style="font-size:15px;margin:0 0 8px;">您申請重新取得學員專區的專屬代碼，如下：</p>

      <div style="margin:24px 0;text-align:center;">
        <div style="display:inline-block;background:#f0ede6;border:1.5px dashed ${C.gold};border-radius:12px;padding:18px 40px;">
          <div style="font-size:11px;color:${C.inkMute};letter-spacing:0.12em;margin-bottom:6px;">專屬代碼 Access Code</div>
          <div style="font-size:28px;font-weight:700;letter-spacing:0.18em;color:${C.green};font-family:monospace;">
            ${data.random_code}
          </div>
        </div>
      </div>

      <p style="font-size:14px;color:${C.inkSoft};margin:0 0 6px;">
        請至學員專區輸入您的 Email 與以上代碼即可登入：
      </p>
      <div style="margin:12px 0 24px;text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://satipatthana-reg.vercel.app'}/member"
           style="display:inline-block;background:${C.green};color:#fff;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.05em;">
          進入學員專區 →
        </a>
      </div>

      <p style="font-size:13px;color:${C.inkMute};border-top:1px solid ${C.line};padding-top:16px;margin:0;">
        若您並未申請此服務，請忽略此信。
      </p>
    `)

    await sendMailWithRetry({
      to: email.toLowerCase().trim(),
      subject: '【第二屆台灣四念處禪修】學員專區專屬代碼',
      html,
    }, { mailType: 'resend_code' })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '寄信失敗，請稍後再試' }, { status: 500 })
  }
}
