import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BATCH_SIZE = 50

export async function GET(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('email_queue')
    .select('status')
    .in('status', ['pending', 'processing'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pending = data?.length ?? 0
  const batches = Math.ceil(pending / BATCH_SIZE)
  const estimatedMinutes = batches

  return NextResponse.json({ pending, estimatedMinutes })
}
