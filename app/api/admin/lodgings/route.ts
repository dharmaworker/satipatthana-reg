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

  // 取所有已錄取學員（含尚未填食宿者），LEFT JOIN 食宿登記
  const { data: regs, error: regsErr } = await supabaseAdmin
    .from('registrations')
    .select(`
      id, chinese_name, passport_name, member_id, student_id, email, phone, random_code,
      residence, gender, dharma_name, payment_plan, payment_status, payment_note, payment_confirmed_at, status,
      created_at
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (regsErr) {
    return NextResponse.json({ error: regsErr.message }, { status: 500 })
  }

  const regIds = (regs || []).map(r => r.id)
  const { data: lodgings } = regIds.length > 0
    ? await supabaseAdmin
        .from('lodging_registrations')
        .select('*')
        .in('registration_id', regIds)
    : { data: [] as any[] }

  const lodgingByReg = new Map<string, any>()
  for (const l of lodgings || []) lodgingByReg.set(l.registration_id, l)

  // 包裝成 rows：每筆都有 registration 子物件，lodging 欄位攤平在 row（無 lodging 時為 null）
  const data = (regs || []).map(reg => {
    const l = lodgingByReg.get(reg.id) || {}
    return {
      id: l.id || null,
      ...l,
      registration: reg,
    }
  })

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
    'photo_url', 'id_front_url', 'id_back_url', 'passport_url', 'arc_url',
    'arrival_ticket_url', 'departure_ticket_url',
    'test_0817_url', 'test_0819_url',
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
