import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('site_config')
    .select('value')
    .eq('key', 'schedule_config')
    .maybeSingle()
  return NextResponse.json(data?.value ?? {})
}
