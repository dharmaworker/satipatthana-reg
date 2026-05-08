import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/admin/interactive/batch-assign
// Body: { patches: Array<{ registration_id, group_status?, assigned_session?, group_serial?, small_status?, assigned_group?, small_serial? }> }
export async function POST(request: NextRequest) {
  if (request.cookies.get('admin_role')?.value !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { patches } = await request.json().catch(() => ({ patches: null }))
  if (!Array.isArray(patches) || patches.length === 0) {
    return NextResponse.json({ error: '缺少 patches' }, { status: 400 })
  }

  let applied = 0
  let failed = 0
  for (const patch of patches) {
    const { registration_id, ...fields } = patch
    if (!registration_id) { failed++; continue }
    const { error } = await supabaseAdmin
      .from('interactive_registrations')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('registration_id', registration_id)
    if (error) failed++
    else applied++
  }

  return NextResponse.json({ success: true, applied, failed })
}
