import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const code = url.searchParams.get('code')

  if (!id || !code) {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
  }

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('id, chinese_name, member_id, student_id, random_code, status, payment_status, payment_plan, residence')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()

  if (error || !reg) {
    return NextResponse.json({ error: '無效的存取連結' }, { status: 401 })
  }

  // 食宿 + 快篩狀態（僅 approved 才查詢）
  let lodgingStatus: 'none' | 'submitted_editable' | 'locked' = 'none'
  let testsUploaded = 0
  if (reg.status === 'approved') {
    const { data: lodging } = await supabaseAdmin
      .from('lodging_registrations')
      .select('id, created_at, updated_at, test_0817_url, test_0819_url')
      .eq('registration_id', reg.id)
      .maybeSingle()

    if (lodging) {
      lodgingStatus = lodging.updated_at !== lodging.created_at ? 'locked' : 'submitted_editable'
    }
    testsUploaded = lodging
      ? Number(!!lodging.test_0817_url) + Number(!!lodging.test_0819_url)
      : 0
  }

  return NextResponse.json({
    ...reg,
    lodging_status: lodgingStatus,
    tests_uploaded: testsUploaded,
    tests_total: 2,
  })
}
