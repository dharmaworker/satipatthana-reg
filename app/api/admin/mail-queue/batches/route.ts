import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  // 分頁全撈：批次會隨每次群發累積，單次查詢上限 1000 筆
  let data: any[]
  try {
    data = await fetchAllRows<any>((from, to) => supabaseAdmin
      .from('email_batches')
      .select('id, triggered_from, recipient_count, created_at, description')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  return NextResponse.json({ batches: data })
}
