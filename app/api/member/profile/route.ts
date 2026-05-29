import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_EDITS = 2

const EDITABLE_FIELDS = [
  'chinese_name', 'id_number', 'passport_name', 'dharma_name',
  'gender', 'age', 'passport_country', 'residence',
  'phone', 'line_id', 'wechat_id',
] as const

async function verifyApproved(id: string, code: string) {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('id, status, profile_edit_count, chinese_name, id_number, passport_name, dharma_name, gender, age, passport_country, residence, phone, line_id, wechat_id')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()
  if (!data || data.status !== 'approved') return null
  return data
}

// GET /api/member/profile?id=...&code=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const reg = await verifyApproved(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })

  const remaining = MAX_EDITS - (reg.profile_edit_count ?? 0)
  return NextResponse.json({
    remaining,
    chinese_name: reg.chinese_name,
    id_number: reg.id_number,
    passport_name: reg.passport_name,
    dharma_name: reg.dharma_name,
    gender: reg.gender,
    age: reg.age,
    passport_country: reg.passport_country,
    residence: reg.residence,
    phone: reg.phone,
    line_id: reg.line_id,
    wechat_id: reg.wechat_id,
  })
}

// PATCH /api/member/profile?id=...&code=...
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  const reg = await verifyApproved(id, code)
  if (!reg) return NextResponse.json({ error: '無效連結' }, { status: 401 })

  const editCount = reg.profile_edit_count ?? 0
  if (editCount >= MAX_EDITS) {
    return NextResponse.json({ error: '已達修改次數上限' }, { status: 403 })
  }

  const body = await request.json()

  // 只允許白名單欄位
  const update: Record<string, any> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }

  if (!update.chinese_name?.trim()) return NextResponse.json({ error: '中文姓名不可為空' }, { status: 400 })
  if (!update.passport_name?.trim()) return NextResponse.json({ error: '護照英文姓名不可為空' }, { status: 400 })
  if (!update.gender) return NextResponse.json({ error: '請選擇性別' }, { status: 400 })
  if (!update.residence) return NextResponse.json({ error: '請選擇居住地' }, { status: 400 })
  if (!update.phone?.trim()) return NextResponse.json({ error: '手機號碼不可為空' }, { status: 400 })
  if (update.age !== undefined && (isNaN(Number(update.age)) || Number(update.age) < 1)) {
    return NextResponse.json({ error: '年齡格式不正確' }, { status: 400 })
  }

  update.profile_edit_count = editCount + 1
  if (update.age !== undefined) update.age = Number(update.age)

  const { error } = await supabaseAdmin
    .from('registrations')
    .update(update)
    .eq('id', reg.id)

  if (error) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })

  return NextResponse.json({ ok: true, remaining: MAX_EDITS - update.profile_edit_count })
}
