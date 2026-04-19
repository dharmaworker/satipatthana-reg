import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 1. bucket
console.log('\n[1] Supabase Storage bucket `lodging-docs`')
const { data: buckets, error: bErr } = await s.storage.listBuckets()
if (bErr) { console.log('❌', bErr.message); process.exit(1) }
const b = buckets.find(x => x.name === 'lodging-docs')
if (!b) console.log('❌ 找不到 bucket')
else console.log(`✅ 找到 bucket (public=${b.public})`)

// 2. 欄位
console.log('\n[2] lodging_registrations 新欄位')
const expected = [
  'id_front_url','id_back_url','passport_url','photo_url',
  'arrival_ticket_url','departure_ticket_url',
  'test_0817_url','test_0819_url','test_0820_url','test_0822_url',
  'flight_arrival_date','flight_arrival_time',
  'flight_departure_date','flight_departure_time',
]
const { error } = await s.from('lodging_registrations').select(expected.join(',')).limit(1)
if (error) console.log('❌', error.message)
else console.log(`✅ 14 欄全在（${expected.length} 欄）`)
