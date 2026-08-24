import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BATCH_SIZE = 30

export async function GET(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { count, error } = await supabaseAdmin
    .from('email_queue')
    // 用 count 取代抓列再數長度：單次查詢上限 1000 筆，佇列一破千就會永遠顯示 1000
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'processing'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pending = count ?? 0
  const batches = Math.ceil(pending / BATCH_SIZE)
  const estimatedMinutes = batches

  return NextResponse.json({ pending, estimatedMinutes })
}
