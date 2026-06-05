import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createDirectMailClient, reconcile, MailRecord } from '@/lib/alibaba-dm'

// 郵件佇列對帳 API
// 一次查詢同時涵蓋 Resend 與 AliCloud 兩個供應商的暫態列，
// 各自對帳後回傳合併結果。兩條路徑互相獨立，一方失敗不影響另一方。

// Resend GET /emails/:id last_event values → our status column
const RESEND_STATUS_MAP: Record<string, string> = {
  delivered:        'delivered',
  bounced:          'bounced',
  complained:       'complained',
  failed:           'failed',
  suppressed:       'suppressed',
  clicked:          'clicked',
  opened:           'opened',
  sent:             'sent',
  scheduled:        'scheduled',
  delivery_delayed: 'delivery_delayed',
}

// AliCloud DirectMail Status 數字碼 → 本系統狀態
// 2(無效地址)、3(垃圾信) 皆歸為 bounced
const ALI_STATUS_MAP: Record<string, string> = {
  '0': 'delivered',
  '2': 'bounced',
  '3': 'bounced',
  '4': 'failed',
}

// 尚未到達終態的狀態，需要繼續對帳
const TRANSIENT_STATUSES = ['sent', 'scheduled', 'delivery_delayed']

const BATCH_SIZE = 8
const BATCH_DELAY_MS = 1100  // 避免觸發 Resend API rate limit

type QueueRow = {
  id: string
  provider: string
  provider_message_id: string | null
  to_email: string
  sent_at: string
  subject: string
  status: string
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// reconcileResend：向 Resend API 逐筆查詢最新狀態並更新 DB。
// 批次送出（每批 BATCH_SIZE 筆）以遵守 rate limit，批次間加延遲。
async function reconcileResend(rows: QueueRow[]) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const updates: { id: string; from: string; to: string }[] = []

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async row => {
        if (!row.provider_message_id) return
        try {
          const res = await fetch(`https://api.resend.com/emails/${row.provider_message_id}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          if (!res.ok) return
          const data = await res.json()
          const newStatus = RESEND_STATUS_MAP[data.last_event]
          if (newStatus && newStatus !== row.status) {
            await supabaseAdmin.from('email_queue').update({ status: newStatus }).eq('id', row.id)
            updates.push({ id: row.id, from: row.status, to: newStatus })
          }
        } catch {
          // 單筆失敗不中斷整批
        }
      })
    )
    if (i + BATCH_SIZE < rows.length) await sleep(BATCH_DELAY_MS)
  }

  return { checked: rows.length, updated: updates.length, updates }
}

// reconcileAlicloud：用寄送時間範圍向 DirectMail API 批次抓取投遞紀錄，
// 以 email（不分大小寫）為鍵建立 Map，再逐列比對找出最接近 sent_at 的紀錄（最小 diffMs），
// 更新 status 與 error 欄位。同一 email 有多筆 DB 列時，各自取各自最佳匹配。
async function reconcileAlicloud(rows: QueueRow[]) {
  if (!rows.length) return { total: 0, updated: 0, unmatched: 0 }

  const dmClient = createDirectMailClient({
    keyId: process.env.ALIBABA_ACCESS_KEY_ID!,
    keySecret: process.env.ALIBABA_ACCESS_KEY_SECRET!,
    region: process.env.ALIBABA_REGION,
  })

  const reconcileRows = rows.map(r => ({ sentAt: r.sent_at, email: r.to_email.toLowerCase() }))

  // 以 email 為鍵，將 DB 列分組，供 onMatch 做模糊時間比對
  const byEmail = new Map<string, QueueRow[]>()
  for (const r of rows) {
    const key = r.to_email.toLowerCase()
    const bucket = byEmail.get(key) ?? []
    bucket.push(r)
    byEmail.set(key, bucket)
  }

  // matchBuffer 記錄每筆 DB 列目前最佳匹配的 API 紀錄（可能被更近的紀錄覆蓋）
  const matchBuffer = new Map<string, MailRecord>()
  const unmatchedIds = new Set<string>(rows.map(r => r.id))

  await reconcile(dmClient, reconcileRows, {
    onMatch: (row, record) => {
      const t2 = Number(record.LastUpdateTime)
      const candidates = byEmail.get(row.email) ?? []

      // 找出 sent_at 與 API LastUpdateTime 差距最小的 DB 列
      let minDiff = Infinity
      let best: QueueRow | null = null
      for (const candidate of candidates) {
        const diff = Math.abs(new Date(candidate.sent_at).getTime() - t2)
        if (diff < minDiff) { minDiff = diff; best = candidate }
      }
      if (!best) return

      // 若此紀錄比先前記錄的更接近，才覆蓋
      const prev = matchBuffer.get(best.id)
      if (!prev || minDiff < Math.abs(Number(prev.LastUpdateTime) - new Date(best.sent_at).getTime())) {
        matchBuffer.set(best.id, record)
        unmatchedIds.delete(best.id)
      }
    },
    onUnmatched: () => {},
  })

  let updated = 0
  for (const [id, record] of matchBuffer) {
    const newStatus = ALI_STATUS_MAP[String(record.Status)] ?? 'failed'
    // 非投遞成功時，將 API 回傳的錯誤訊息寫入 error 欄位
    const errorMsg = newStatus !== 'delivered' ? (record.Message ?? null) : null
    const { error } = await supabaseAdmin
      .from('email_queue')
      .update({ status: newStatus, error: errorMsg })
      .eq('id', id)
    if (!error) updated++
  }

  return { total: rows.length, updated, unmatched: unmatchedIds.size }
}

export async function POST(request: NextRequest) {
  const role = request.cookies.get('admin_role')?.value
  if (role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  // 一次查詢兩個供應商的暫態列，再按 provider 分流
  const { data: allRows, error } = await supabaseAdmin
    .from('email_queue')
    .select('id, provider, provider_message_id, to_email, sent_at, subject, status')
    .in('provider', ['resend', 'alicloud'])
    .in('status', TRANSIENT_STATUSES)
    .order('sent_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!allRows?.length) return NextResponse.json({
    resend:   { checked: 0, updated: 0, updates: [] },
    alicloud: { total: 0, updated: 0, unmatched: 0 },
  })

  const resendRows = allRows.filter(r => r.provider === 'resend') as QueueRow[]
  const aliRows    = allRows.filter(r => r.provider === 'alicloud') as QueueRow[]

  // 兩個供應商並行對帳；allSettled 確保一方出錯不影響另一方結果
  const [resendResult, aliResult] = await Promise.allSettled([
    reconcileResend(resendRows),
    reconcileAlicloud(aliRows),
  ])

  return NextResponse.json({
    resend:   resendResult.status === 'fulfilled' ? resendResult.value  : { error: resendResult.reason?.message },
    alicloud: aliResult.status    === 'fulfilled' ? aliResult.value     : { error: aliResult.reason?.message },
  })
}
