import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 測 8/17 / 8/19 還在
const { error: eOk } = await s.from('lodging_registrations')
  .select('test_0817_url, test_0819_url').limit(1)
console.log(eOk ? `❌ 8/17 或 8/19 欄位有問題: ${eOk.message}` : '✅ test_0817_url + test_0819_url 仍存在')

// 測 8/20 / 8/22 已刪
const { error: eDropped } = await s.from('lodging_registrations')
  .select('test_0820_url, test_0822_url').limit(1)
if (eDropped && eDropped.message.includes('does not exist')) {
  console.log('✅ test_0820_url / test_0822_url 已成功 drop')
} else if (eDropped) {
  console.log('⚠️ 錯誤:', eDropped.message)
} else {
  console.log('❌ 8/20 / 8/22 欄位還在，SQL 可能沒跑')
}
