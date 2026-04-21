import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const memberId = request.cookies.get('member_id')?.value
  if (!memberId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('id, chinese_name, member_id, student_id, random_code, status, payment_status, payment_plan, residence')
    .eq('id', memberId)
    .eq('status', 'approved')
    .single()

  if (error || !reg) {
    return NextResponse.json({ error: '無效的登入狀態' }, { status: 401 })
  }

  // 食宿 + 快篩狀態
  const { data: lodging } = await supabaseAdmin
    .from('lodging_registrations')
    .select('id, created_at, updated_at, test_0817_url, test_0819_url')
    .eq('registration_id', reg.id)
    .maybeSingle()

  let lodgingStatus: 'none' | 'submitted_editable' | 'locked' = 'none'
  if (lodging) {
    lodgingStatus = lodging.updated_at !== lodging.created_at ? 'locked' : 'submitted_editable'
  }
  const testsUploaded = lodging
    ? Number(!!lodging.test_0817_url) + Number(!!lodging.test_0819_url)
    : 0

  return NextResponse.json({
    ...reg,
    lodging_status: lodgingStatus,
    tests_uploaded: testsUploaded,
    tests_total: 2,
  })
}
