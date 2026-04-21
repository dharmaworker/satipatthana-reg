import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Action = 'approve' | 'reject' | 'delete'

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (!role) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { ids, action } = await request.json() as { ids: string[]; action: Action }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: '未選取任何筆' }, { status: 400 })
  }
  if (!['approve', 'reject', 'delete'].includes(action)) {
    return NextResponse.json({ error: '未知的 action' }, { status: 400 })
  }

  // 權限檢查
  if (action === 'delete' && role !== 'admin') {
    return NextResponse.json({ error: '僅 admin 可批次刪除' }, { status: 403 })
  }
  if ((action === 'approve' || action === 'reject') && role !== 'admin' && role !== 'reviewer') {
    return NextResponse.json({ error: '僅 admin / reviewer 可批次審核' }, { status: 403 })
  }

  if (action === 'delete') {
    // 先撈 QR URL，清 Storage
    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select('id, line_qr_url, wechat_qr_url')
      .in('id', ids)

    const { error: delErr } = await supabaseAdmin
      .from('registrations')
      .delete()
      .in('id', ids)
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    try {
      const paths: string[] = []
      for (const r of regs || []) {
        for (const url of [r.line_qr_url, r.wechat_qr_url]) {
          if (!url) continue
          const marker = '/qr-codes/'
          const idx = url.indexOf(marker)
          if (idx >= 0) paths.push(url.slice(idx + marker.length))
        }
      }
      if (paths.length) {
        await supabaseAdmin.storage.from('qr-codes').remove(paths)
      }
    } catch (storageErr) {
      console.error('[batch delete] storage cleanup failed:', storageErr)
    }

    return NextResponse.json({ success: true, count: regs?.length ?? ids.length })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  // 批次改狀態；序號（member_id）改為完全手動管理，不在此流程動它
  const { error: updErr } = await supabaseAdmin
    .from('registrations')
    .update({ status: newStatus })
    .in('id', ids)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    count: ids.length,
  })
}
