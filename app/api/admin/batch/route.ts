import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchRowsByIds } from '@/lib/supabase'
import { nextAvailableMemberId, formatMemberId, formatOnlineMemberId, nextAvailableOnlineStudentId, formatOnlineStudentId } from '@/lib/member-id'

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
    // 先撈 QR URL + 食宿上傳檔 URL，清 Storage
    const regs = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('registrations')
      .select('id, line_qr_url, wechat_qr_url')
      .in('id', chunk))

    // 依 id 分批查詢：uuid 全塞進查詢字串會超過長度上限，單次查詢也只回 1000 筆
    const lodgings = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
      .from('lodging_registrations')
      .select('id_front_url, id_back_url, passport_url, arc_url, photo_url, arrival_ticket_url, departure_ticket_url, test_0817_url, test_0819_url')
      .in('registration_id', chunk))

    const { error: delErr } = await supabaseAdmin
      .from('registrations')
      .delete()
      .in('id', ids)
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    const extractPath = (url: string | null | undefined, marker: string) => {
      if (!url) return null
      const idx = url.indexOf(marker)
      return idx >= 0 ? url.slice(idx + marker.length) : null
    }

    try {
      const qrPaths = (regs || []).flatMap(r =>
        [r.line_qr_url, r.wechat_qr_url].map(u => extractPath(u, '/qr-codes/')).filter(Boolean)
      ) as string[]
      if (qrPaths.length) await supabaseAdmin.storage.from('qr-codes').remove(qrPaths)
    } catch (e) {
      console.error('[batch delete] qr-codes cleanup failed:', e)
    }

    try {
      const lodgingPaths = lodgings.flatMap(l =>
        [l.id_front_url, l.id_back_url, l.passport_url, l.arc_url, l.photo_url,
         l.arrival_ticket_url, l.departure_ticket_url, l.test_0817_url, l.test_0819_url]
          .map(u => extractPath(u, '/lodging-docs/')).filter(Boolean)
      ) as string[]
      if (lodgingPaths.length) await supabaseAdmin.storage.from('lodging-docs').remove(lodgingPaths)
    } catch (e) {
      console.error('[batch delete] lodging-docs cleanup failed:', e)
    }

    return NextResponse.json({ success: true, count: regs?.length ?? ids.length })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  // 先撈目前狀態＋member_id＋retreat_format
  const currentRegs = await fetchRowsByIds<any>(ids, chunk => supabaseAdmin
    .from('registrations')
    .select('id, status, member_id, student_id, retreat_format')
    .in('id', chunk))

  let assignedCount = 0
  if (action === 'approve') {
    // 批次錄取：對尚未編號者依序編（線上 L-XXX，實體 T-XXX）
    const needAssignInPerson = currentRegs.filter(r => r.status !== 'approved' && !r.member_id && r.retreat_format !== 'online')

    if (needAssignInPerson.length > 0) {
      const start = await nextAvailableMemberId(false)
      const m = start.match(/^T-(\d+)$/)
      let n = m ? parseInt(m[1], 10) : 1
      for (const r of needAssignInPerson) {
        const mid = formatMemberId(n++)
        await supabaseAdmin
          .from('registrations')
          .update({ status: 'approved', member_id: mid })
          .eq('id', r.id)
        assignedCount++
      }
    }

    // 線上：所有尚未 approved 的都要處理（有 member_id 但沒 student_id 的也要補）
    const onlineToApprove = currentRegs.filter(r =>
      r.status !== 'approved' && r.retreat_format === 'online'
    )
    if (onlineToApprove.length > 0) {
      let no = 1, ns = 1
      if (onlineToApprove.some(r => !r.member_id)) {
        const startMid = await nextAvailableMemberId(true)
        const mo = startMid.match(/^L-(\d+)$/)
        no = mo ? parseInt(mo[1], 10) : 1
      }
      if (onlineToApprove.some(r => !r.student_id)) {
        const startSid = await nextAvailableOnlineStudentId()
        const ms = startSid.match(/^C-(\d+)$/)
        ns = ms ? parseInt(ms[1], 10) : 1
      }
      for (const r of onlineToApprove) {
        const fields: Record<string, unknown> = { status: 'approved' }
        if (!r.member_id) fields.member_id = formatOnlineMemberId(no++)
        if (!r.student_id) fields.student_id = formatOnlineStudentId(ns++)
        await supabaseAdmin.from('registrations').update(fields).eq('id', r.id)
        assignedCount++
      }
    }

    // 剩下：實體且已 approved 或已有 member_id 的，只改狀態
    const remaining = currentRegs
      .filter(r => r.retreat_format !== 'online' && !(r.status !== 'approved' && !r.member_id))
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
    const wasApproved = currentRegs.filter(r => r.status === 'approved').map(r => r.id)
    if (wasApproved.length > 0) {
      await supabaseAdmin
        .from('registrations')
        .update({ status: newStatus, member_id: null })
        .in('id', wasApproved)
    }
    const others = currentRegs.filter(r => r.status !== 'approved').map(r => r.id)
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
