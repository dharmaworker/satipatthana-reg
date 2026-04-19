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
    .select('id, test_0817_url, test_0819_url, test_0820_url, test_0822_url, updated_at')
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

    // 必須先填過食宿登記（才有 lodging row）
    const { data: lodging } = await supabaseAdmin
      .from('lodging_registrations')
      .select('id')
      .eq('registration_id', reg.id)
      .maybeSingle()
    if (!lodging) {
      return NextResponse.json({ error: '請先完成食宿登記再上傳快篩檢測結果' }, { status: 400 })
    }

    const allowed = ['test_0817_url', 'test_0819_url', 'test_0820_url', 'test_0822_url']
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of allowed) {
      if (k in fields) updateData[k] = fields[k] || null
    }
    if (Object.keys(updateData).length === 1) {
      // 只有 updated_at，沒實際上傳任何檔
      return NextResponse.json({ error: '請至少上傳一個快篩檔案' }, { status: 400 })
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('lodging_registrations')
      .update(updateData)
      .eq('id', lodging.id)
      .select('test_0817_url, test_0819_url, test_0820_url, test_0822_url')
      .single()
    if (updErr) {
      console.error('[quicktests] update failed:', updErr)
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
