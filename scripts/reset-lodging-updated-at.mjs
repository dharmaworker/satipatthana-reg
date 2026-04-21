// 修復 bug 副作用：把過去因快篩上傳而被誤改的 updated_at 重設為 created_at
// 這樣受影響的學員可以正常再修改 1 次食宿登記。
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await s
  .from('lodging_registrations')
  .select('id, created_at, updated_at')

if (error) { console.error(error); process.exit(1) }

let fixed = 0
for (const r of data) {
  if (r.updated_at !== r.created_at) {
    const { error: upErr } = await s
      .from('lodging_registrations')
      .update({ updated_at: r.created_at })
      .eq('id', r.id)
    if (upErr) {
      console.error(`✗ ${r.id.slice(0, 8)}: ${upErr.message}`)
    } else {
      console.log(`✓ reset ${r.id.slice(0, 8)}: updated_at ← created_at`)
      fixed++
    }
  }
}
console.log(`\n總共處理 ${data.length} 筆，重設 ${fixed} 筆。`)
