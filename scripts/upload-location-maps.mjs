import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const BUCKET = 'location-maps'
const FILES = [
  { local: '台北車站A.jpg', key: 'taipei-station.jpg', label: '台北車站位置示意圖' },
  { local: '台中高鐵.jpg', key: 'wuri-hsr.jpg', label: '台中高鐵站一樓6號出口示意圖' },
  { local: '桃機第一航廈.jpg', key: 'taoyuan-airport-t1.jpg', label: '桃園機場第一航廈一樓集合點示意圖' },
]

// 建立或確認 bucket 為 public
const { data: buckets } = await s.storage.listBuckets()
const existing = (buckets || []).find(b => b.name === BUCKET)
if (!existing) {
  const { error } = await s.storage.createBucket(BUCKET, { public: true })
  if (error) { console.error('❌ 建立 bucket 失敗', error); process.exit(1) }
  console.log(`✅ 建立公開 bucket: ${BUCKET}`)
} else {
  console.log(`ℹ️  bucket 已存在: ${BUCKET}（public=${existing.public}）`)
  if (!existing.public) {
    const { error } = await s.storage.updateBucket(BUCKET, { public: true })
    if (error) { console.error('❌ 改為 public 失敗', error); process.exit(1) }
    console.log(`✅ 已改為 public`)
  }
}

for (const f of FILES) {
  const buf = readFileSync(f.local)
  const { error } = await s.storage.from(BUCKET).upload(f.key, buf, {
    contentType: 'image/jpeg', upsert: true,
  })
  if (error) { console.error(`❌ 上傳 ${f.local} 失敗`, error); continue }
  const { data } = s.storage.from(BUCKET).getPublicUrl(f.key)
  console.log(`✅ ${f.label}: ${data.publicUrl}`)
}
