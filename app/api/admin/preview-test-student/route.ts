import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PREVIEW_EMAIL, PREVIEW_CODE, PREVIEW_NAME } from '@/lib/preview-test-student'

export async function POST(request: NextRequest) {
  if (request.cookies.get('admin_role')?.value !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  // 找看看現成的
  const { data: existing } = await supabaseAdmin
    .from('registrations')
    .select('id, random_code, status')
    .eq('email', PREVIEW_EMAIL)
    .maybeSingle()

  if (existing) {
    if (existing.status !== 'approved') {
      await supabaseAdmin
        .from('registrations')
        .update({ status: 'approved' })
        .eq('id', existing.id)
    }
    return NextResponse.json({ id: existing.id, code: existing.random_code, created: false })
  }

  // 沒有就建一筆
  const { data: created, error } = await supabaseAdmin
    .from('registrations')
    .insert({
      random_code: PREVIEW_CODE,
      chinese_name: PREVIEW_NAME,
      passport_name: 'Preview Test Student',
      identity: 'lay',
      gender: 'male',
      age: 30,
      residence: 'taiwan',
      phone: '0000000000',
      email: PREVIEW_EMAIL,
      status: 'approved',
    })
    .select('id, random_code')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || '建立失敗' }, { status: 500 })
  }
  return NextResponse.json({ id: created.id, code: created.random_code, created: true })
}
