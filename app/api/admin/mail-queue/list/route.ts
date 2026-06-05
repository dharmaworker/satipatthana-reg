import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const hours = searchParams.get('hours')
  const search = searchParams.get('search')
  const solo = searchParams.get('solo')
  const batch = searchParams.get('batch')
  const provider = searchParams.get('provider')
  const limit = Math.min(Number(searchParams.get('limit') || 200), 500)

  let query = supabaseAdmin
    .from('email_queue')
    .select('id, to_email, subject, mail_type, provider, status, attempt_count, created_at, error, parent_id, batch_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length) query = query.in('status', statuses)
  }

  if (hours && hours !== 'all') {
    const since = new Date(Date.now() - Number(hours) * 3600_000).toISOString()
    query = query.gte('created_at', since)
  }

  if (search) {
    const q = search.replace(/'/g, "''")
    query = query.or(`to_email.ilike.%${q}%,subject.ilike.%${q}%`)
  }

  if (solo === 'true') {
    query = query.is('batch_id', null)
  }

  if (batch) {
    const batchId = batch.trim()
    if (batchId.length === 36) {
      query = query.eq('batch_id', batchId)
    } else {
      // prefix lookup
      const { data: matches } = await supabaseAdmin
        .from('email_batches')
        .select('id')
        .ilike('id', `${batchId}%`)
        .limit(1)
      const resolvedId = matches?.[0]?.id
      if (resolvedId) {
        query = query.eq('batch_id', resolvedId)
      } else {
        return NextResponse.json({ rows: [], warning: `No batch found for prefix: ${batchId}` })
      }
    }
  }

  if (provider) {
    const providers = provider.split(',').map(s => s.trim()).filter(Boolean)
    if (providers.length) query = query.in('provider', providers)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []

  // if any child rows are in the result but their parent isn't, fetch the missing parents
  const returnedIds = new Set(rows.map(r => r.id))
  const missingParentIds = [...new Set(
    rows.map(r => r.parent_id).filter((id): id is string => !!id && !returnedIds.has(id))
  )]

  if (missingParentIds.length) {
    const { data: parents } = await supabaseAdmin
      .from('email_queue')
      .select('id, to_email, subject, mail_type, provider, status, attempt_count, created_at, error, parent_id, batch_id')
      .in('id', missingParentIds)
    if (parents?.length) rows.push(...parents)
  }

  return NextResponse.json({ rows })
}
