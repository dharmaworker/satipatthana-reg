import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  PREVIEW_DEFAULT_EMAIL,
  PREVIEW_CODE,
  PREVIEW_NAME,
  getPreviewRegistration,
  setPreviewRegistrationId,
} from '@/lib/preview-test-student'

function checkAuth(request: NextRequest) {
  return request.cookies.get('admin_role')?.value === 'admin'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 讀目前測試學員（給前端 prompt 預設值用）
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '權限不足' }, { status: 403 })
  const reg = await getPreviewRegistration()
  return NextResponse.json({
    exists: !!reg,
    email: reg?.email ?? null,
    code: PREVIEW_CODE,
  })
}

// 建立或更新測試學員。可指定 email 讓委託人收測試信。
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const rawEmail = (body.email || '').toString().trim().toLowerCase()
  if (rawEmail && !EMAIL_RE.test(rawEmail)) {
    return NextResponse.json({ error: 'email 格式不合法' }, { status: 400 })
  }

  const existing = await getPreviewRegistration()

  if (existing) {
    // 已有 row。若 email 提供且與現有不同，先確認沒被其他真實學員佔用，再更新。
    if (rawEmail && rawEmail !== existing.email) {
      const { data: clash } = await supabaseAdmin
        .from('registrations')
        .select('id')
        .eq('email', rawEmail)
        .neq('id', existing.id)
        .maybeSingle()
      if (clash) {
        return NextResponse.json({ error: 'email 已被其他學員使用' }, { status: 409 })
      }
      const { error } = await supabaseAdmin
        .from('registrations')
        .update({ email: rawEmail })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({
      id: existing.id,
      code: PREVIEW_CODE,
      email: rawEmail || existing.email,
      created: false,
    })
  }

  // 沒有就建一筆。email 沒提供就用預設 invalid email。
  const emailToUse = rawEmail || PREVIEW_DEFAULT_EMAIL

  // 建立前先 double check 沒有被真實學員佔用
  const { data: clash } = await supabaseAdmin
    .from('registrations')
    .select('id')
    .eq('email', emailToUse)
    .maybeSingle()
  if (clash) {
    return NextResponse.json({ error: 'email 已被其他學員使用' }, { status: 409 })
  }

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
      email: emailToUse,
      status: 'approved',
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || '建立失敗' }, { status: 500 })
  }

  await setPreviewRegistrationId(created.id)

  return NextResponse.json({
    id: created.id,
    code: PREVIEW_CODE,
    email: emailToUse,
    created: true,
  })
}
