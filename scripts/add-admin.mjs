// 用法：node scripts/add-admin.mjs <username> <password> <name> <role>
// role: admin | reviewer | finance | readonly
// 會 upsert（已存在同 username 則更新密碼/角色/姓名）

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'

const [username, password, name, role] = process.argv.slice(2)

if (!username || !password || !name || !role) {
  console.log('Usage: node scripts/add-admin.mjs <username> <password> <name> <role>')
  console.log('  role: admin | reviewer | finance | readonly')
  process.exit(1)
}

const VALID_ROLES = ['admin', 'reviewer', 'finance', 'readonly']
if (!VALID_ROLES.includes(role)) {
  console.log(`❌ role 必須是 ${VALID_ROLES.join(' / ')} 之一`)
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

if (!env.PASSWORD_SALT) {
  console.log('❌ .env.local 缺 PASSWORD_SALT')
  process.exit(1)
}

const passwordHash = createHash('sha256').update(password + env.PASSWORD_SALT).digest('hex')
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await admin
  .from('admin_users')
  .upsert(
    { username, password_hash: passwordHash, name, role },
    { onConflict: 'username' }
  )
  .select()
  .single()

if (error) {
  console.log('❌ 失敗:', error.message)
  process.exit(1)
}

console.log(`✅ upsert 成功: username=${data.username}, role=${data.role}, name=${data.name}`)
