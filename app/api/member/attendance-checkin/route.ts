import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function verifyMember(id: string, code: string) {
  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('id, status, chinese_name, student_id, phone, email')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()
  if (error || !data) return null
  return data
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  const code = url.searchParams.get('code') || ''

  const reg = await verifyMember(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })
  if (reg.status !== 'approved') return NextResponse.json({ error: '僅限錄取學員' }, { status: 403 })

  const { data: checkin } = await supabaseAdmin
    .from('attendance_checkins')
    .select('attendance_status, submitted_at')
    .eq('registration_id', id)
    .maybeSingle()

  return NextResponse.json({
    chinese_name: reg.chinese_name,
    student_id: reg.student_id,
    phone: reg.phone,
    email: reg.email,
    existing: checkin || null,
  })
}

export async function POST(request: NextRequest) {
  const { id, code, attendance_status } = await request.json()

  const reg = await verifyMember(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })
  if (reg.status !== 'approved') return NextResponse.json({ error: '僅限錄取學員' }, { status: 403 })

  const valid = ['full', 'partial', 'absent']
  if (!valid.includes(attendance_status)) {
    return NextResponse.json({ error: '無效的參課情況' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('attendance_checkins')
    .upsert(
      { registration_id: id, attendance_status, updated_at: new Date().toISOString() },
      { onConflict: 'registration_id' },
    )

  if (error) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
