import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendQuickTestsConfirmationEmail } from '@/lib/quicktests-email'

// GET：給前端讀目前已上傳的快篩 URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const code = searchParams.get('code')
  if (!id || !code) {
    return NextResponse.json({ error: '缺少 id 或 code' }, { status: 400 })
  }
  const { data: reg, error: regErr } = await supabaseAdmin
    .from('registrations')
    .select('id, random_code, chinese_name, email, member_id, status, payment_plan')
    .eq('id', id)
    .eq('random_code', code.toUpperCase())
    .single()
  if (regErr || !reg) {
    return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })
  }
  if (reg.status !== 'approved') {
    return NextResponse.json({ error: '尚未錄取' }, { status: 403 })
  }
  const { data: lodging } = await supabaseAdmin
    .from('lodging_registrations')
    .select('id, test_0817_url, test_0819_url, updated_at')
    .eq('registration_id', reg.id)
    .maybeSingle()

  return NextResponse.json({ registration: reg, lodging: lodging || null })
}

// POST：寫入 4 個 test_*_url 任意組合
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, ...fields } = body
    if (!id || !code) {
      return NextResponse.json({ error: '缺少 id 或 code' }, { status: 400 })
    }

    const { data: reg, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('id, random_code, chinese_name, email, member_id, status, payment_plan')
      .eq('id', id)
      .eq('random_code', code.toUpperCase())
      .single()
    if (regErr || !reg) {
      return NextResponse.json({ error: '找不到報名資料' }, { status: 404 })
    }
    if (reg.status !== 'approved') {
      return NextResponse.json({ error: '尚未錄取' }, { status: 403 })
    }

    const allowed = ['test_0817_url', 'test_0819_url']
    const testData: Record<string, unknown> = {}
    for (const k of allowed) {
      if (k in fields) testData[k] = fields[k] || null
    }
    if (Object.keys(testData).length === 0) {
      return NextResponse.json({ error: '請至少上傳一個快篩檔案' }, { status: 400 })
    }

    // upsert 食宿登記 row（不存在就建最小記錄，其餘欄位允許為 null）
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('lodging_registrations')
      .upsert({
        registration_id: reg.id,
        ...testData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'registration_id' })
      .select('test_0817_url, test_0819_url')
      .single()
    if (updErr) {
      console.error('[quicktests] upsert failed:', updErr)
      return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
    }

    // 確認信（失敗不影響）
    try {
      await sendQuickTestsConfirmationEmail(reg, updated)
    } catch (mailErr) {
      console.error('[quicktests] 確認信寄送失敗:', mailErr)
    }

    return NextResponse.json({ success: true, lodging: updated })
  } catch (err: any) {
    console.error('[quicktests] error:', err)
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  }
}
