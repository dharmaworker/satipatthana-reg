import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_SCHEDULES = 10

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_role')?.value === 'admin'
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: '僅 admin 可查看' }, { status: 403 })
  }
  const { data, error } = await supabaseAdmin
    .from('scheduled_exports')
    .select('*')
    .order('scheduled_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: '僅 admin 可新增' }, { status: 403 })
  }
  const body = await request.json()
  const { scheduled_at, recipients, enabled } = body

  if (!scheduled_at || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'scheduled_at 與 recipients（至少一個）皆必填' }, { status: 400 })
  }
  const cleanRecipients = recipients.map((r: string) => r.trim()).filter(Boolean)
  if (cleanRecipients.some(r => !r.includes('@'))) {
    return NextResponse.json({ error: '收件人格式不正確' }, { status: 400 })
  }

  const { count } = await supabaseAdmin
    .from('scheduled_exports')
    .select('*', { count: 'exact', head: true })
  if ((count ?? 0) >= MAX_SCHEDULES) {
    return NextResponse.json({ error: `排程上限 ${MAX_SCHEDULES} 筆，請先刪除舊排程` }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('scheduled_exports')
    .insert({ scheduled_at, recipients: cleanRecipients, enabled: enabled ?? true })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: '僅 admin 可修改' }, { status: 403 })
  }
  const body = await request.json()
  const { id, scheduled_at, recipients, enabled } = body
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const updateData: Record<string, unknown> = {}
  if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at
  if (recipients !== undefined) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: '至少需要一位收件人' }, { status: 400 })
    }
    const clean = recipients.map((r: string) => r.trim()).filter(Boolean)
    if (clean.some(r => !r.includes('@'))) {
      return NextResponse.json({ error: '收件人格式不正確' }, { status: 400 })
    }
    updateData.recipients = clean
  }
  if (enabled !== undefined) updateData.enabled = enabled

  const { data, error } = await supabaseAdmin
    .from('scheduled_exports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: '僅 admin 可刪除' }, { status: 403 })
  }
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('scheduled_exports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
