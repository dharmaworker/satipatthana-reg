# 寄信系統說明（開發者版）

> 更新：2026-05-26

---

## 一、系統架構總覽

```
管理後台觸發批量發信
        │
        ▼
  sendMailBatch()
        │
   ┌────┴────────────┐
   │                 │
非 QQ/163         QQ / 163
   │                 │
Resend batch     email_queue (DB)
（即時送出）          │
                 Vercel Cron
                 每分鐘 30 封
                 阿里雲 SMTP
```

---

## 二、寄件管道

| 管道 | 用途 | 設定 |
|------|------|------|
| **Resend** | 主要寄件（非 QQ/163） | `RESEND_API_KEY`、`RESEND_FROM` |
| **阿里雲 SMTP** | QQ/163 queue 送出；Resend webhook 補寄 | `ALIBABA_SMTP_HOST/PORT/USER/PASSWORD/FROM` |
| **Gmail** | Resend 單封重試最後一次備援 | `GMAIL_USER`、`GMAIL_APP_PASSWORD` |

---

## 三、核心函式（`lib/mailer.ts`）

### `sendMail(params)`
單封，走 Resend。失敗寄警告信給 `dharmaworker2.tw@gmail.com`。

### `sendMailWithRetry(params, maxAttempts=3, baseDelayMs=600, gmailFallback=true)`
單封含 retry。預設 3 次，最後一次切 Gmail 備援。

### `sendMailBatch(mails)`
批次發信，**自動依收件域名分流**：
- `@qq.com`、`@163.com` → 寫入 `email_queue` table，由 cron 節流送出
- 其他 → Resend batch API（每批最多 100 封）；整批失敗改 Gmail 逐封補送

---

## 四、QQ/163 節流 Queue

### 為什麼需要？
QQ、163 對境外寄件域名有嚴格反垃圾機制，短時間大量寄信會被延遲投遞或丟垃圾信匣。目前報名表中 QQ 160 封、163 34 封，共 **194 封**，必須節流。

### DB table：`email_queue`

| 欄位 | 說明 |
|------|------|
| `id` | UUID，主鍵 |
| `to_email` | 收件人 |
| `subject` | 主旨 |
| `html` | 信件內容 |
| `bcc` | 密件副本（可 null） |
| `status` | `pending` / `processing` / `sent` / `failed` |
| `created_at` | 建立時間 |
| `processing_at` | 開始處理時間（卡住偵測用） |
| `sent_at` | 送出時間 |
| `error` | 失敗原因 |

### Cron Route：`/api/admin/cron/process-mail-queue`

- **觸發**：Vercel Cron，每分鐘一次（`* * * * *`）
- **每次處理**：取 30 筆 `pending`，用阿里雲 SMTP 逐封送出
- **防重複**：取出時立即標記 `processing`
- **卡住復原**：超過 3 分鐘仍 `processing` → 自動重設為 `pending`
- **授權**：Vercel Cron 帶 `Authorization: Bearer $CRON_SECRET`，或 admin cookie

### 流量估算
194 封 ÷ 30 封/批 = 7 批 → 約 **7 分鐘**送完

---

## 五、Resend Webhook（`/api/webhooks/resend`）

監聽三種事件，自動用**阿里雲 SMTP** 補寄：

| 事件 | 說明 | 補寄上限 |
|------|------|----------|
| `email.bounced` | 退信 | 無限制（每次都補） |
| `email.failed` | 寄送失敗 | 無限制 |
| `email.delivery_delayed` | 投遞延遲 | **1 次**（記錄於 `site_config.webhook_alibaba_attempts`） |

`delivery_delayed` 限制 1 次原因：Resend 本身會持續重試，webhook 只是加一道保險，補太多次反而可能重複寄。

---

## 六、各 API Route 使用的函式

| Route | 函式 | 說明 |
|-------|------|------|
| `api/register` | `sendMailWithRetry` | 報名確認信 |
| `api/lodging` | `sendMailWithRetry` | 住宿確認信 |
| `api/member/resend-code` | `sendMailWithRetry` | 重寄驗證碼 |
| `api/admin/send-notifications` | `sendMailBatch` | 錄取通知 |
| `api/admin/send-formal-notifications` | `sendMailBatch` | 正式學員通知 |
| `api/admin/send-attendance-notify` | `sendMailBatch` | 出席提醒 |
| `api/admin/send-timetable-notify` | `sendMailBatch` | 課程時間表通知 |
| `api/admin/send-student-id` | `sendMailBatch` | 學號分配通知 |
| `api/admin/send-group-join` | `sendMailBatch` | 加入群組通知 |
| `api/admin/cron/run-exports` | `sendMail` | 排程匯出結果 |
| `api/webhooks/resend` | 阿里雲直接送 | Resend 失敗補寄 |

---

## 七、管理後台 Queue 狀態顯示

- **API**：`GET /api/admin/mail-queue/status` → `{ pending: number, estimatedMinutes: number }`
- **位置**：`app/admin/lodgings/page.tsx`
- **行為**：
  - 頁面載入時查一次，之後每 30 秒輪詢
  - `pending > 0` 時，所有批量發送按鈕 **disable**
  - 顯示：「⏳ 尚有 X 封 QQ/163 排隊中，約 Y 分鐘後送完，請勿再次發送」

---

## 八、Resend API 限制

- Rate limit：**5 req/sec/team**（跨所有 API key 共享）
- Batch API：每次最多 100 封，算 1 個 request
- 超過回 429，`retry-after` header 告知等待秒數
- 目前 code 用固定間隔 retry，**未讀 `retry-after`**（日後可優化）

---

## 九、注意事項

- `sendMail` / `sendMailBatch` 成功只代表 Resend / 阿里雲**接受**，不保證收件方送達
- 阿里雲 SMTP 每日上限 **100 封**，僅適合手動補寄或 webhook 少量補寄，**不適合大量發信**
- QQ/163 的 `delivery_delayed` 不等於失敗，Resend 會繼續重試
- `email_queue` 的 `failed` 記錄目前不會自動重試，需手動處理
