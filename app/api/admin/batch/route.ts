import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { nextAvailableMemberId, formatMemberId } from '@/lib/member-id'

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

  // 先撈目前狀態＋member_id
  const { data: currentRegs } = await supabaseAdmin
    .from('registrations')
    .select('id, status, member_id')
    .in('id', ids)

  let assignedCount = 0
  if (action === 'approve') {
    // 批次錄取：對尚未編號者依序編 T-XXX（以當前最大號 +1 起跑，避免互相衝突）
    const needAssign = (currentRegs || []).filter(r => r.status !== 'approved' && !r.member_id)
    if (needAssign.length > 0) {
      const start = await nextAvailableMemberId()
      const m = start.match(/^T-(\d+)$/)
      let n = m ? parseInt(m[1], 10) : 1
      for (const r of needAssign) {
        const mid = formatMemberId(n++)
        await supabaseAdmin
          .from('registrations')
          .update({ status: 'approved', member_id: mid })
          .eq('id', r.id)
        assignedCount++
      }
    }
    // 剩下的（已 approved 或已有 member_id）只需改狀態（若有變動）
    const remaining = (currentRegs || [])
      .filter(r => !(r.status !== 'approved' && !r.member_id))
      .map(r => r.id)
    if (remaining.length > 0) {
      const { error: updErr } = await supabaseAdmin
        .from('registrations')
        .update({ status: 'approved' })
        .in('id', remaining)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
  } else {
    // 批次拒絕：若原本是 approved → 註銷 member_id
    const wasApproved = (currentRegs || []).filter(r => r.status === 'approved').map(r => r.id)
    if (wasApproved.length > 0) {
      await supabaseAdmin
        .from('registrations')
        .update({ status: newStatus, member_id: null })
        .in('id', wasApproved)
    }
    const others = (currentRegs || []).filter(r => r.status !== 'approved').map(r => r.id)
    if (others.length > 0) {
      await supabaseAdmin
        .from('registrations')
        .update({ status: newStatus })
        .in('id', others)
    }
  }

  return NextResponse.json({
    success: true,
    count: ids.length,
    assignedMemberIds: assignedCount,
  })
}
