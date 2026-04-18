// 用法：node scripts/test-role.mjs <username> <password>
// 登入後對各 admin API 打一輪，印出 HTTP status 和回應（判斷權限是否正確）
// 需要 dev server 跑在 localhost:3000

const [username, password] = process.argv.slice(2)
if (!username || !password) {
  console.log('Usage: node scripts/test-role.mjs <username> <password>')
  process.exit(1)
}

const base = 'http://localhost:3000'
const jar = []

async function req(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.join('; '),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookies = res.headers.getSetCookie?.() || []
  for (const c of setCookies) jar.push(c.split(';')[0])
  let data
  try { data = await res.json() } catch { data = null }
  return { status: res.status, data }
}

console.log(`\n=== Testing role for user: ${username} ===\n`)

const login = await req('POST', '/api/admin/login', { username, password })
if (login.status !== 200) {
  console.log(`❌ 登入失敗 (${login.status})`, login.data)
  process.exit(1)
}
console.log(`✅ 登入成功 role=${login.data.role} name=${login.data.name}\n`)

const list = await req('GET', '/api/admin/registrations')
console.log(`GET /api/admin/registrations → ${list.status} (${list.status === 200 ? `看到 ${list.data.data?.length ?? 0} 筆` : list.data?.error})`)

const anyId = list.data?.data?.[0]?.id

if (anyId) {
  const patchStatus = await req('PATCH', '/api/admin/registrations', { id: anyId, status: 'pending' })
  console.log(`PATCH status           → ${patchStatus.status} ${patchStatus.data?.error ?? 'OK'}`)

  const patchPayment = await req('PATCH', '/api/admin/registrations', { id: anyId, payment_status: 'unpaid' })
  console.log(`PATCH payment_status   → ${patchPayment.status} ${patchPayment.data?.error ?? 'OK'}`)
} else {
  console.log('(registrations 是空的，跳過 PATCH 測試)')
}

const send = await req('POST', '/api/admin/send-notifications', { ids: ['00000000-0000-0000-0000-000000000000'] })
console.log(`POST send-notifications → ${send.status} ${send.data?.error ?? 'OK (但不會真的寄，因 id 不存在)'}`)

const exp = await req('GET', '/api/admin/export')
console.log(`GET export             → ${exp.status} ${exp.status === 200 ? 'CSV OK' : '?'}\n`)
