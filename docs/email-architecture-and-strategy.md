# 寄信架構與大量發信策略分析

> 更新：2026-05-26

---

## 一、目前 Code 寄信架構

### 寄件管道

| 管道 | 用途 | 說明 |
|------|------|------|
| **Resend** | 主要寄件（非 QQ/163） | 透過 `@resend/node` SDK，寄件人 `noreply@tw-satipatthana-2026-reg.org` |
| **阿里雲 SMTP** | QQ/163 queue 送出；Resend webhook 補寄 | 每日上限 100 封，僅適合 queue/補寄，不適合大量直接發信 |
| **Gmail (nodemailer)** | `sendMailWithRetry` 最後一次備援 | Resend 單封重試全失敗才切換 |

### 核心函式（`lib/mailer.ts`）

| 函式 | 說明 |
|------|------|
| `sendMail(params)` | 單封，Resend 送，失敗寄警告信給 `dharmaworker2.tw@gmail.com` |
| `sendMailWithRetry(params, maxAttempts=3, baseDelayMs=600, gmailFallback=true)` | 單封含 retry，最後一次自動切 Gmail 備援 |
| `sendMailBatch(mails)` | 批次；**QQ/163 自動寫入 `email_queue`**，其他走 Resend batch（失敗改 Gmail） |

### 各 API Route 使用的函式

| Route | 函式 | 說明 |
|-------|------|------|
| `api/register` | `sendMailWithRetry` | 報名確認信（單封，有 retry） |
| `api/lodging` | `sendMailWithRetry` | 住宿確認信 |
| `api/member/resend-code` | `sendMailWithRetry` | 重寄驗證碼 |
| `api/admin/send-notifications` | `sendMailBatch` | 錄取通知（批次） |
| `api/admin/send-formal-notifications` | `sendMailBatch` | 正式通知（批次） |
| `api/admin/send-attendance-notify` | `sendMailBatch` | 出席通知（批次） |
| `api/admin/send-timetable-notify` | `sendMailBatch` | 課程時間表通知（批次） |
| `api/admin/send-student-id` | `sendMailBatch` | 學員編號（批次） |
| `api/admin/send-group-join` | `sendMailBatch` | 加入群組通知（批次） |
| `api/admin/cron/run-exports` | `sendMail` | 排程匯出結果通知 |
| `api/webhooks/resend` | 阿里雲直接送 | delivery_delayed / bounced / failed 補寄 |

### Resend Webhook（`api/webhooks/resend`）

- 監聽事件：`email.bounced`、`email.failed`、`email.delivery_delayed`
- 收到事件 → 從 Resend API 取回原始信件 → 改用**阿里雲 SMTP** 補寄
- `delivery_delayed` 限制：最多補寄 **1 次**（記錄在 `site_config.webhook_alibaba_attempts`）

---

## 二、收件人 Email 域名分佈（2026-05-26）

| 域名 | 人數 | 風險 |
|------|------|------|
| QQ (`@qq.com`) | 160 | 高 |
| 163 (`@163.com`) | 34 | 高 |
| 其他（Gmail/Yahoo 等） | 約 121 | 低 |
| **總計** | **約 315+** | |

---

## 三、大量發信問題分析

### QQ / 163 的風險

- 兩者皆為中國郵件服務，對境外寄件域名有嚴格的反垃圾機制
- 短時間內同一域名大量寄信，QQ/163 會延遲投遞（`delivery_delayed`）甚至丟垃圾信匣
- Resend 的 `delivery_delayed` **不算 code 層面的失敗**，`sendMail` 回傳成功只代表 Resend 接受信件，實際投遞狀態只能靠 webhook 得知
- 阿里雲 SMTP 同理，`250 Data Ok` 只代表阿里雲接受，不保證送達

### Resend API Rate Limit

- 官方限制：**5 req/sec/team**（跨所有 API key 共享），可向 Resend 申請提高
- 超過回 429，response header `retry-after` 會告知需等待幾秒
- 批次 API（`resend.batch.send()`）每次最多 100 封，每次算 1 個 API request
- 非 QQ/163 約 121 封，分 2 批 = 2 個 API request，完全不會觸發 rate limit

**Resend log 裡的 429**：不一定是我們打 API 太快，更常見的是 Resend 投遞到收件方（如 QQ）時，收件方回 429 拒收，屬於收件端問題。

**會碰到 API 層 429 的情境**：多人同時報名，每人各觸發一次 `sendMail`，瞬間超過 5 req/sec。目前 code 透過 `sendMailWithRetry` 的 retry 處理，但沒有讀 `retry-after` header 精準等待。

### 阿里雲 SMTP 限制

- 無批次 API，只能 SMTP 逐封送
- 目前方案每日上限 **100 封**，不適合直接大量發信
- 適合：queue cron 每分鐘 30 封節流送出，或 webhook 少量補寄

---

## 四、已實作方案

### QQ/163 節流 Queue（`email_queue` table）

`sendMailBatch` 自動依域名分流：
- QQ/163 → 寫入 `email_queue`
- 其他 → Resend batch 直接送

**Cron job**（`/api/admin/cron/process-mail-queue`，`* * * * *`）：
- 每分鐘取 **30 筆** `pending`，用阿里雲 SMTP 送出
- 194 封 QQ/163 ÷ 30 封/批 = 7 批，約 **7 分鐘**送完
- 防重複：取出時立即標記 `processing`
- 卡住復原：超過 3 分鐘仍 `processing` → 重設為 `pending`

### 管理後台保護

- `GET /api/admin/mail-queue/status` 回傳 `{ pending, estimatedMinutes }`
- 後台頁面每 30 秒輪詢；有待寄時所有發送按鈕 **disable**，顯示剩餘封數與預估時間

### Resend Webhook 補寄

- 補寄改用阿里雲（對 QQ/163 信譽較好）
- `delivery_delayed` 最多補寄 1 次，避免重複寄

---

## 五、注意事項

- `delivery_delayed` 不等於寄失敗，Resend 仍會繼續重試，實測延遲通常在 1 天內送達
- 信件內容、寄件域名信譽、收件人是否曾互動都會影響 QQ 的投遞判斷
- 阿里雲 SMTP 每日額度用完後需等隔天重置
- `email_queue` 的 `failed` 記錄目前不會自動重試，需手動處理
- 兩個管道都只能確認「接受」，無法即時確認「送達」
