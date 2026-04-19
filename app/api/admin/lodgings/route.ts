import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  return role ? role : null
}

export async function GET(request: NextRequest) {
  const role = checkAuth(request)
  if (!role) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('lodging_registrations')
    .select(`
      *,
      registration:registrations (
        id, chinese_name, passport_name, member_id, email, phone, random_code,
        residence, payment_plan, payment_status, status
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}
