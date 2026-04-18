import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

const MAX_SIZE = 500 * 1024 // 500KB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const kind = (formData.get('kind') as string) || 'misc'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少檔案' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '檔案過大，請壓縮至 500KB 以下' }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: '僅接受 JPG / PNG / WEBP 圖片' }, { status: 400 })
    }

    const ext = file.type.split('/')[1] || 'png'
    const safeKind = ['line', 'wechat'].includes(kind) ? kind : 'misc'
    const filename = `${safeKind}/${randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabaseAdmin
      .storage
      .from('qr-codes')
      .upload(filename, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })
    if (uploadErr) {
      console.error('[upload-qr] upload failed:', uploadErr)
      return NextResponse.json({ error: '上傳失敗，請稍後再試' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('qr-codes')
      .getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl, path: filename })
  } catch (err) {
    console.error('[upload-qr] error:', err)
    return NextResponse.json({ error: '上傳失敗' }, { status: 500 })
  }
}
