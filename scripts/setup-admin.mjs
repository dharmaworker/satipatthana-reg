import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { createHash, randomBytes } from 'crypto'

const envPath = '.env.local'
let envText = readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

let salt = env.PASSWORD_SALT
if (!salt || salt === 'change-me-to-a-long-random-string' || salt === '') {
  salt = randomBytes(32).toString('hex')
  if (envText.match(/^PASSWORD_SALT=.*/m)) {
    envText = envText.replace(/^PASSWORD_SALT=.*/m, `PASSWORD_SALT=${salt}`)
  } else {
    envText += `\nPASSWORD_SALT=${salt}\n`
  }
  writeFileSync(envPath, envText)
  console.log(`🔑 Generated new PASSWORD_SALT (寫入 .env.local)`)
  console.log(`⚠️  Vercel 也要設同一個值： PASSWORD_SALT=${salt}`)
} else {
  console.log('🔑 使用既有 PASSWORD_SALT')
}

const username = 'sati_admin'
const password = 'Sati2026!08'
const name = '管理員'
const role = 'admin'

const passwordHash = createHash('sha256').update(password + salt).digest('hex')

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 清掉舊的 admin_users，再寫入新的
const { error: delErr } = await admin.from('admin_users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
if (delErr) { console.log('❌ 刪舊 admin 失敗:', delErr.message); process.exit(1) }

const { data, error } = await admin.from('admin_users').insert({
  username,
  password_hash: passwordHash,
  name,
  role,
}).select().single()

if (error) { console.log('❌ 新增 admin 失敗:', error.message); process.exit(1) }

console.log(`✅ 管理員建好：username=${data.username}, role=${data.role}, name=${data.name}`)
