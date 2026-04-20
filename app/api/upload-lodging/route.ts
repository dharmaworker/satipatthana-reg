import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const VALID_KINDS = [
  'id_front', 'id_back', 'passport', 'photo',
  'arrival_ticket', 'departure_ticket',
  'test_0817', 'test_0819',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const kind = (formData.get('kind') as string) || ''

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少檔案' }, { status: 400 })
    }
    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: '檔案類型不正確' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '檔案過大，請壓縮至 5MB 以下' }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: '僅接受 JPG / PNG / WEBP / PDF' }, { status: 400 })
    }

    let ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ext || ext.length > 4) {
      ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'bin')
    }
    const filename = `${kind}/${randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabaseAdmin
      .storage
      .from('lodging-docs')
      .upload(filename, arrayBuffer, { contentType: file.type, upsert: false })
    if (uploadErr) {
      console.error('[upload-lodging] upload failed:', uploadErr)
      return NextResponse.json({ error: '上傳失敗，請稍後再試' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('lodging-docs')
      .getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[upload-lodging] error:', err)
    return NextResponse.json({ error: '上傳失敗' }, { status: 500 })
  }
}
