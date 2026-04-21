import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLodgingArchiveEmail } from '@/lib/archive-email'

function checkAuth(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (!role) return null
  return role
}

// 取得報名列表
export async function GET(request: NextRequest) {
  const role = checkAuth(request)
  if (!role) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  let query = supabaseAdmin
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(
      `chinese_name.ilike.%${search}%,email.ilike.%${search}%,random_code.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// 更新報名狀態
export async function PATCH(request: NextRequest) {
  const role = checkAuth(request)
  if (!role) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const canEditStatus = role === 'admin' || role === 'reviewer'
  const canEditPayment = role === 'admin' || role === 'finance'

  if (!canEditStatus && !canEditPayment) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const body = await request.json()
  const {
    id,
    status,
    payment_status,
    member_id,
    student_id,
    chinese_name,
    email,
    residence,
    payment_plan,
    line_qr_url,
    wechat_qr_url,
  } = body

  if ((status !== undefined || member_id !== undefined || student_id !== undefined) && !canEditStatus) {
    return NextResponse.json({ error: '無權修改錄取狀態' }, { status: 403 })
  }
  if (payment_status !== undefined && !canEditPayment) {
    return NextResponse.json({ error: '無權修改繳費狀態' }, { status: 403 })
  }

  const adminOnlyFields = {
    chinese_name, email, residence, payment_plan, line_qr_url, wechat_qr_url,
  }
  const hasAdminOnlyEdits = Object.values(adminOnlyFields).some(v => v !== undefined)
  if (hasAdminOnlyEdits && role !== 'admin') {
    return NextResponse.json({ error: '僅 admin 可修改基本資料與方案' }, { status: 403 })
  }

  // 先撈目前狀態、payment_plan、payment_status、member_id，用於偵測轉變
  const { data: currentReg } = await supabaseAdmin
    .from('registrations')
    .select('status, payment_plan, payment_status, member_id')
    .eq('id', id)
    .single()

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (member_id !== undefined) updateData.member_id = member_id || null
  if (student_id !== undefined) updateData.student_id = student_id || null
  if (payment_status) {
    updateData.payment_status = payment_status
    if (payment_status === 'verified') {
      updateData.payment_confirmed_at = new Date().toISOString()
    }
  }
  if (chinese_name !== undefined) updateData.chinese_name = chinese_name
  if (email !== undefined) updateData.email = email
  if (residence !== undefined) updateData.residence = residence
  if (payment_plan !== undefined) updateData.payment_plan = payment_plan || null
  if (line_qr_url !== undefined) updateData.line_qr_url = line_qr_url || null
  if (wechat_qr_url !== undefined) updateData.wechat_qr_url = wechat_qr_url || null

  // 注意：序號（member_id）改為完全手動管理，不再依狀態變化自動產生或註銷

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }

  // 注意：按錄取時「不」自動寄信，由 /admin/dashboard「批次寄出錄取信」手動觸發

  // 寄食宿登記備存信（失敗不影響 PATCH）
  // 條件（二擇一）：
  //   a) payment_plan 被改成新的有效值
  //   b) payment_status 首次轉為 verified（admin 確認繳款）
  const planChanged =
    payment_plan !== undefined &&
    payment_plan &&
    payment_plan !== currentReg?.payment_plan
  const verifiedTransition =
    payment_status === 'verified' && currentReg?.payment_status !== 'verified'

  if ((planChanged || verifiedTransition) && data) {
    try {
      await sendLodgingArchiveEmail(data)
    } catch (mailErr) {
      console.error('[registrations PATCH] lodging archive failed:', mailErr)
    }
  }

  return NextResponse.json({ success: true, data })
}

// 刪除報名紀錄（含 QR 圖檔清理）
export async function DELETE(request: NextRequest) {
  const role = checkAuth(request)
  if (role !== 'admin') {
    return NextResponse.json({ error: '僅 admin 角色可刪除' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 先撈 QR URL 以便之後清檔
  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('line_qr_url, wechat_qr_url')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin
    .from('registrations')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }

  // 清 Storage QR 檔（失敗不影響主流程）
  try {
    const paths: string[] = []
    for (const url of [reg?.line_qr_url, reg?.wechat_qr_url]) {
      if (!url) continue
      const marker = '/qr-codes/'
      const idx = url.indexOf(marker)
      if (idx >= 0) paths.push(url.slice(idx + marker.length))
    }
    if (paths.length) {
      await supabaseAdmin.storage.from('qr-codes').remove(paths)
    }
  } catch (storageErr) {
    console.error('[registrations DELETE] storage cleanup failed:', storageErr)
  }

  return NextResponse.json({ success: true })
}