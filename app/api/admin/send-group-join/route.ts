import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendGroupJoinEmail } from '@/lib/group-join-email'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  const { data: registrations, error } = await supabaseAdmin
    .from('registrations')
    .select('id, email, chinese_name, line_qr_url, wechat_qr_url')
    .in('id', ids)
    .eq('status', 'approved')

  if (error || !registrations) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  let ok = 0, failed = 0, skipped = 0
  for (const reg of registrations) {
    if (!reg.line_qr_url && !reg.wechat_qr_url) {
      skipped++
      continue
    }
    try {
      await sendGroupJoinEmail(reg)
      ok++
    } catch (e) {
      console.error('[send-group-join]', reg.email, e)
      failed++
    }
  }

  const parts = [`成功 ${ok} 封`]
  if (failed > 0) parts.push(`失敗 ${failed} 封`)
  if (skipped > 0) parts.push(`跳過 ${skipped} 筆（無 LINE / 微信資料）`)
  return NextResponse.json({ message: `寄送完成：${parts.join('，')}`, ok, failed, skipped })
}
