import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { derivePaymentPlan } from '@/lib/lodging-plan'

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
        residence, payment_plan, payment_status, payment_note, payment_confirmed_at, status
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// Admin 編輯食宿登記（不受 6/20 截止限制）
export async function PATCH(request: NextRequest) {
  const role = checkAuth(request)
  if (role !== 'admin') {
    return NextResponse.json({ error: '僅 admin 可編輯食宿登記' }, { status: 403 })
  }
  const body = await request.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const allowed = [
    'arrival_date', 'departure_date', 'payment_method',
    'emergency_name', 'emergency_relation', 'emergency_phone',
    'arrival_transport', 'departure_transport', 'bus_destination',
    'diet', 'noon_fasting', 'snacks',
    'dinner_0819', 'dinner_0824', 'snoring', 'agree_covid_rules',
    'flight_arrival_date', 'flight_arrival_time',
    'flight_departure_date', 'flight_departure_time',
    'photo_url', 'id_front_url', 'id_back_url', 'passport_url',
    'arrival_ticket_url', 'departure_ticket_url',
    'test_0817_url', 'test_0819_url', 'test_0820_url', 'test_0822_url',
  ]
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) {
    if (k in fields) updateData[k] = fields[k] === '' ? null : fields[k]
  }

  const { data: lodging, error } = await supabaseAdmin
    .from('lodging_registrations')
    .update(updateData)
    .eq('id', id)
    .select('*, registration:registrations(id)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 若 dates / method 有變動，重新推導 payment_plan
  if (lodging && ('arrival_date' in updateData || 'departure_date' in updateData || 'payment_method' in updateData)) {
    const newPlan = derivePaymentPlan(
      lodging.arrival_date as any,
      lodging.departure_date as any,
      lodging.payment_method as any,
    )
    if (newPlan) {
      await supabaseAdmin
        .from('registrations')
        .update({ payment_plan: newPlan })
        .eq('id', lodging.registration_id)
    }
  }

  return NextResponse.json({ data: lodging })
}
