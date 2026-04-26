// One-shot：把 public/webpage/{poster,sunset-bg} + public/teachers/* 上傳到 Supabase site-assets bucket
// 用法：cd satipatthana-reg && node scripts/upload-site-assets.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// 簡易 .env.local 載入
const envText = readFileSync('.env.local', 'utf-8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const BUCKET = 'site-assets'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const mimeOf = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext === 'webp' ? 'image/webp'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'png' ? 'image/png'
    : 'application/octet-stream'
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.find(b => b.name === BUCKET)) {
    console.log(`✓ bucket "${BUCKET}" already exists`)
    return
  }
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (error) throw error
  console.log(`✓ created public bucket "${BUCKET}"`)
}

async function upload(localPath, storagePath) {
  const buffer = readFileSync(localPath)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeOf(localPath),
      upsert: true,
    })
  if (error) throw error
  console.log(`✓ ${storagePath}`)
}

await ensureBucket()

await upload('public/webpage/poster.jpg', 'poster.jpg')
await upload('public/webpage/sunset-bg.jpg', 'sunset-bg.jpg')

for (const f of readdirSync('public/teachers')) {
  await upload(join('public/teachers', f), `teachers/${f}`)
}

console.log('\n全部完成。Public URL 範例：')
console.log(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/poster.jpg`)
