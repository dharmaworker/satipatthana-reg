import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const memberId = request.cookies.get('member_id')?.value
  console.log('member_id cookie:', memberId)
  console.log('all cookies:', request.cookies.getAll())

  if (!memberId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('chinese_name, member_id, status, payment_status')
    .eq('id', memberId)
    .eq('payment_status', 'verified')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '無效的登入狀態' }, { status: 401 })
  }

  return NextResponse.json(data)
}