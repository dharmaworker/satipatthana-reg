import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchInteractiveConfig } from '@/lib/interactive-config'

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

  // 食宿 + 快篩 + 互動狀態（僅 approved 才查詢）
  let lodgingStatus: 'none' | 'submitted_editable' | 'locked' = 'none'
  let testsUploaded = 0
  let interactiveSubmitted = false
  let interactiveGroupStatus: 'pending' | 'won' | 'lost' = 'pending'
  let interactiveSmallStatus: 'pending' | 'won' | 'lost' = 'pending'
  let interactiveTaskSubmitted = false

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

    const { data: it } = await supabaseAdmin
      .from('interactive_registrations')
      .select('group_status, small_status')
      .eq('registration_id', reg.id)
      .maybeSingle()
    if (it) {
      interactiveSubmitted = true
      interactiveGroupStatus = it.group_status
      interactiveSmallStatus = it.small_status
    }

    const { data: task } = await supabaseAdmin
      .from('interactive_tasks')
      .select('registration_id')
      .eq('registration_id', reg.id)
      .maybeSingle()
    interactiveTaskSubmitted = !!task
  }

  const interactiveConfig = await fetchInteractiveConfig()
  const isAdmin = request.cookies.get('admin_role')?.value === 'admin'

  return NextResponse.json({
    ...reg,
    lodging_status: lodgingStatus,
    tests_uploaded: testsUploaded,
    tests_total: 2,
    interactive_open: interactiveConfig.open || isAdmin,
    interactive_preview: isAdmin && !interactiveConfig.open,
    interactive_submitted: interactiveSubmitted,
    interactive_group_status: interactiveGroupStatus,
    interactive_small_status: interactiveSmallStatus,
    interactive_task_submitted: interactiveTaskSubmitted,
  })
}
