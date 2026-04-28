import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 承諾書下載 — 僅錄取學員可下載
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const code = url.searchParams.get('code')

  if (!id || !code) {
    return NextResponse.json({ error: '請從學員專區進入' }, { status: 401 })
  }

  const { data: reg, error } = await supabaseAdmin
    .from('registrations')
    .select('status')
    .eq('id', id)
    .eq('random_code', code.toUpperCase().trim())
    .single()
  if (error || !reg) {
    return NextResponse.json({ error: '無效的存取連結' }, { status: 401 })
  }
  if (reg.status !== 'approved') {
    return NextResponse.json({ error: '本檔案僅限錄取學員下載' }, { status: 403 })
  }

  // 從 private bucket 抓檔案串流給學員
  const { data, error: dlErr } = await supabaseAdmin.storage
    .from('private-docs')
    .download('pledge.docx')
  if (dlErr || !data) {
    return NextResponse.json({ error: '檔案下載失敗' }, { status: 500 })
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('承諾書.docx')}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
