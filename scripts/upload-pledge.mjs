// 一次性：把承諾書 docx 上傳到 site-assets bucket
// 用法：cd satipatthana-reg && node scripts/upload-pledge.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envText = readFileSync('.env.local', 'utf-8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const buffer = readFileSync('/tmp/承諾書.docx')
const { error } = await supabase.storage
  .from('site-assets')
  .upload('pledge.docx', buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  })

if (error) { console.error(error); process.exit(1) }

const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl('pledge.docx')
console.log('Uploaded:', publicUrl)
