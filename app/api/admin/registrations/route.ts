import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
  const { id, status, payment_status, member_id } = body

  if ((status !== undefined || member_id !== undefined) && !canEditStatus) {
    return NextResponse.json({ error: '無權修改錄取狀態' }, { status: 403 })
  }
  if (payment_status !== undefined && !canEditPayment) {
    return NextResponse.json({ error: '無權修改繳費狀態' }, { status: 403 })
  }

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (member_id) updateData.member_id = member_id
  if (payment_status) {
    updateData.payment_status = payment_status
    if (payment_status === 'verified') {
      updateData.payment_confirmed_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}