import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMail } from '@/lib/mailer'
import { generateExportWorkbook } from '@/lib/export-excel'

// Vercel Cron 排程端點：每次執行時檢查所有已到期但尚未執行的排程，逐一產 Excel 寄出。
// 授權：Vercel Cron 會帶 Authorization: Bearer $CRON_SECRET
//       如果未設 CRON_SECRET，暫時允許匿名（方便手動測試），但仍建議設定。

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // 未設定時不檢查（開發用）
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  return runExports(request)
}
export async function POST(request: NextRequest) {
  return runExports(request)
}

async function runExports(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // 找所有已到期且尚未執行（或上次執行早於 scheduled_at）的啟用中排程
  const { data: due, error } = await supabaseAdmin
    .from('scheduled_exports')
    .select('*')
    .eq('enabled', true)
    .lte('scheduled_at', now.toISOString())
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ id: string; status: 'ok' | 'skipped' | 'error'; message?: string }> = []

  for (const sched of due || []) {
    const scheduledAt = new Date(sched.scheduled_at)
    const lastRunAt = sched.last_run_at ? new Date(sched.last_run_at) : null
    // 已在這個 scheduled_at 之後跑過就跳過
    if (lastRunAt && lastRunAt >= scheduledAt) {
      results.push({ id: sched.id, status: 'skipped' })
      continue
    }

    try {
      // 截止資料：scheduled_at 的前一日 24:00（= scheduled_at 那天 00:00 當下，台灣時區）
      // 以 scheduled_at 的日期為基準：cutoff = 該日期 (YYYY-MM-DD) 的 00:00 台灣時間
      const y = scheduledAt.getUTCFullYear()
      const m = scheduledAt.getUTCMonth()
      const d = scheduledAt.getUTCDate()
      // 台灣時區 UTC+8。UTC 該日 00:00 對應台灣 08:00，往前推 8 小時得台灣 00:00
      // 實作上：我們以 scheduled_at 的 UTC 日期，往前推一點到該日開始 (台北 00:00)
      // 簡化處理：cutoff = 同一 UTC 日期的 00:00 - 8 小時 = 前一日 16:00 UTC = 前一日 24:00 台北
      const cutoff = new Date(Date.UTC(y, m, d, 0, 0, 0) - 8 * 60 * 60 * 1000)

      const { buffer, filename, counts } = await generateExportWorkbook(cutoff)

      const dateLabel = cutoff.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
      await sendMail({
        to: sched.recipients,
        subject: `【第二屆台灣四念處禪修】自動彙整報表 (截止 ${dateLabel} 24:00)`,
        html: `
          <p>附件為至 <strong>${dateLabel} 24:00</strong> 為止的報名統整報表（Excel）。</p>
          <p>統計：</p>
          <ul>
            <li>總報名：${counts.total}</li>
            <li>待審核：${counts.pending}</li>
            <li>已錄取待繳費：${counts.approved_unpaid}</li>
            <li>已繳費：${counts.verified}</li>
            <li>未錄取：${counts.rejected}</li>
          </ul>
          <p style="color:#666;font-size:13px;">本信由系統自動寄出。</p>
        `,
        attachments: [{
          filename,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }],
      })

      await supabaseAdmin
        .from('scheduled_exports')
        .update({ last_run_at: new Date().toISOString(), last_error: null })
        .eq('id', sched.id)

      results.push({ id: sched.id, status: 'ok' })
    } catch (e: any) {
      console.error('[cron run-exports] failed for', sched.id, e)
      await supabaseAdmin
        .from('scheduled_exports')
        .update({ last_error: e.message?.slice(0, 500) || String(e) })
        .eq('id', sched.id)
      results.push({ id: sched.id, status: 'error', message: e.message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
