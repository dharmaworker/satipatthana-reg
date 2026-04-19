import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

console.log('\n[1] lodging_registrations:')
const { count: lodgingCount, error: lErr } = await s.from('lodging_registrations').select('*', { count: 'exact', head: true })
if (lErr) console.log('❌', lErr.message); else console.log(`✅ table exists, ${lodgingCount} rows`)

console.log('\n[2] registrations.payment_plan cleared?')
const { count: regCount } = await s.from('registrations').select('*', { count: 'exact', head: true })
const { count: withPlan } = await s.from('registrations').select('*', { count: 'exact', head: true }).not('payment_plan', 'is', null)
console.log(`   總報名 ${regCount} 筆，其中還有 payment_plan 的：${withPlan}`)
console.log(withPlan === 0 ? '✅ 全部已清空' : '⚠️ 仍有殘留')
