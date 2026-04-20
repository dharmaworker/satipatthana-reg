import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 測試：嘗試 insert 一筆只帶 test_*_url 的 lodging row（先找一個現有 registration）
console.log('\n[驗證] 嘗試 insert 只帶快篩 URL 的 lodging row')
const { data: anyReg } = await s.from('registrations').select('id, chinese_name').limit(1).single()
if (!anyReg) {
  console.log('❌ 找不到任何 registration，跳過')
  process.exit(0)
}

// 先清掉那筆 registration 的 lodging（若存在）
await s.from('lodging_registrations').delete().eq('registration_id', anyReg.id)

const { data, error } = await s
  .from('lodging_registrations')
  .insert({ registration_id: anyReg.id, test_0817_url: 'https://example.com/test.jpg' })
  .select()
  .single()

if (error) {
  console.log('❌ insert 失敗：', error.message)
  console.log('→ 代表某個 NOT NULL 約束還沒解除，SQL 可能沒跑完整')
  process.exit(1)
}
console.log('✅ 成功建立 minimal lodging row（只帶 test_0817_url）')
console.log(`   registration=${anyReg.chinese_name} lodging.id=${data.id}`)
console.log(`   arrival_date=${data.arrival_date ?? 'null'}, payment_method=${data.payment_method ?? 'null'}`)

// 清掉測試資料
await s.from('lodging_registrations').delete().eq('id', data.id)
console.log('🧹 已清掉測試資料')
