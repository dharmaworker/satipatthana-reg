import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/member/password?id=...&code=...
// Body: { password: string }  — 空字串 = 清除自訂密碼（回到手機末4碼）
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  const code = searchParams.get('code') || ''

  if (!id || !code) return NextResponse.json({ error: '無效連結' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('registrations')
    .select('id')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()

  if (!data) return NextResponse.json({ error: '無效連結' }, { status: 401 })

  const { password } = await request.json()

  const newPassword = typeof password === 'string' && password.trim() ? password.trim() : null

  const { error } = await supabaseAdmin
    .from('registrations')
    .update({ member_password: newPassword })
    .eq('id', id)

  if (error) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
