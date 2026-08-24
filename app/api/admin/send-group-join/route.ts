import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchRowsByIds } from '@/lib/supabase'
import { sendGroupJoinEmail } from '@/lib/group-join-email'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { ids } = await request.json()

  // 依 id 分批查詢：uuid 全塞進查詢字串會超過長度上限，單次查詢也只回 1000 筆
  let registrations: any[]
  try {
    registrations = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('registrations')
      .select('id, email, chinese_name, member_id, line_qr_url, wechat_qr_url')
      .in('id', chunk)
      .eq('status', 'approved'))
  } catch {
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
