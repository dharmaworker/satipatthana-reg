import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const pubKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const secretKey = env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing:', url)

const admin = createClient(url, secretKey)
const pub = createClient(url, pubKey)

for (const table of ['registrations', 'admin_users']) {
  try {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`❌ [admin] ${table}:`, error.message)
    } else {
      console.log(`✅ [admin] ${table}: exists, ${count} rows`)
    }
  } catch (e) {
    console.log(`❌ [admin] ${table}:`, e.message)
  }
}

try {
  const { error } = await pub.from('registrations').select('*', { head: true, count: 'exact' })
  if (error) {
    console.log(`✅ [anon] registrations: blocked as expected (${error.code || error.message})`)
  } else {
    console.log(`⚠️ [anon] registrations: readable without auth — RLS 沒鎖好`)
  }
} catch (e) {
  console.log('[anon] error:', e.message)
}
