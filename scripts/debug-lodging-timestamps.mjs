import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 列出目前所有 lodging 紀錄的時間戳，看 created_at 跟 updated_at 是否相等
const { data, error } = await s
  .from('lodging_registrations')
  .select('id, registration_id, created_at, updated_at')
  .order('created_at', { ascending: false })
  .limit(20)

if (error) { console.error(error); process.exit(1) }

console.log(`\n共 ${data.length} 筆\n`)
for (const r of data) {
  const equal = r.created_at === r.updated_at
  console.log(`${equal ? '✓' : '✗'}  ${r.id.slice(0, 8)}  created=${r.created_at}`)
  if (!equal) {
    console.log(`                            updated=${r.updated_at}`)
    const diff = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()
    console.log(`                            diff=${diff}ms`)
  }
}
