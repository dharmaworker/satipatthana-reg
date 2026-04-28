// 把 pledge.docx 從 public site-assets 搬到 private 'private-docs' bucket
// 跑一次後 site-assets/pledge.docx 會被刪掉，學員只能透過 /api/pledge 下載
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envText = readFileSync('.env.local', 'utf-8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// 1. 確保 private-docs bucket 存在（private）
const { data: buckets } = await supabase.storage.listBuckets()
if (!buckets?.find(b => b.name === 'private-docs')) {
  const { error } = await supabase.storage.createBucket('private-docs', { public: false })
  if (error) { console.error('createBucket:', error); process.exit(1) }
  console.log('✓ created private bucket "private-docs"')
} else {
  console.log('✓ bucket "private-docs" already exists')
}

// 2. 從本機 docx 上傳到 private bucket
const buffer = readFileSync('/tmp/承諾書.docx')
const { error: upErr } = await supabase.storage
  .from('private-docs')
  .upload('pledge.docx', buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  })
if (upErr) { console.error('upload:', upErr); process.exit(1) }
console.log('✓ uploaded private-docs/pledge.docx')

// 3. 刪掉 public site-assets/pledge.docx
const { error: rmErr } = await supabase.storage.from('site-assets').remove(['pledge.docx'])
if (rmErr) console.warn('remove from site-assets failed (可能本來就沒有):', rmErr.message)
else console.log('✓ removed site-assets/pledge.docx')

console.log('\n完成。學員只能透過 /api/pledge?id=&code= 下載（要 approved 才行）。')
