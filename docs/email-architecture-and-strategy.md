# 寄信架構與大量發信策略分析

> 更新：2026-05-25

---

## 一、目前 Code 寄信架構

### 寄件管道

| 管道 | 用途 | 說明 |
|------|------|------|
| **Resend** | 主要寄件 | 透過 `@resend/node` SDK，寄件人 `noreply@tw-satipatthana-2026-reg.org` |
| **Gmail (nodemailer)** | 備援 | Resend 失敗時自動切換，或 webhook 補寄 |
| **阿里雲 SMTP (nodemailer)** | 手動補寄 | 僅限手動對 QQ/163 延遲信補寄，每日上限 100 封 |

### 核心函式（`lib/mailer.ts`）

| 函式 | 說明 |
|------|------|
| `sendMail(params)` | 單封，Resend 送，失敗寄警告信給 `dharmaworker2.tw@gmail.com` |
| `sendMailWithRetry(params, maxAttempts=3, baseDelayMs=600, gmailFallback=true)` | 單封含 retry，最後一次自動切 Gmail 備援 |
| `sendMailBatch(mails)` | 批次，每批最多 100 封，Resend batch API；整批失敗改 Gmail 逐封補送 |

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
| `api/admin/cron/run-exports` | `sendMail` | 排程匯出結果通知 |
| `api/webhooks/resend` | Gmail 直接送 | delivery_delayed / bounced / failed 補寄 |

### Resend Webhook（`api/webhooks/resend`）

- 監聽事件：`email.bounced`、`email.failed`、`email.delivery_delayed`
- 收到事件 → 從 Resend API 取回原始信件 → 改用 Gmail 補寄
- `delivery_delayed` 限制：最多補寄 **1 次**（記錄在 `site_config.webhook_gmail_attempts`）

---

## 二、收件人 Email 域名分佈（2026-05-25）

| 域名 | 人數 | 風險 |
|------|------|------|
| QQ (`@qq.com`) | 140 | 高 |
| 163 (`@163.com`) | 25 | 高 |
| 其他（Gmail/Yahoo 等） | 150 | 低 |
| **總計** | **315** | |

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
- 315 封分 4 批 = 4 個 API request，完全不會觸發 rate limit
- 真正有問題的是對收件方（QQ/163）的投遞頻率，不是 Resend API 本身

**Resend log 裡的 429**：不一定是我們打 API 太快，更常見的是 Resend 投遞到收件方（如 QQ）時，收件方回 429 拒收，屬於收件端問題。

**會碰到 API 層 429 的情境**：多人同時報名，每人各觸發一次 `sendMail`，瞬間超過 5 req/sec。目前 code 透過 `sendMailWithRetry` 的 retry 處理，但沒有讀 `retry-after` header 精準等待。

### 阿里雲 SMTP 限制

- 無批次 API，只能 SMTP 逐封送
- 目前方案每日上限 **100 封**，無法用於大量發信
- 適合：手動補寄少量 QQ/163 延遲信

---

## 四、方案比較

| 方案 | 做法 | 優點 | 缺點 |
|------|------|------|------|
| **A** | 全部 Resend batch，不加間隔 | 最簡單，速度快 | QQ/163 延遲機率高 |
| **B** | 非 QQ/163 用 Resend batch；QQ/163 用阿里雲逐封 | 降低 QQ/163 延遲 | 阿里雲每日只有 100 封，不夠用 |
| **C（建議）** | 全部 Resend batch；QQ/163 分批加間隔 | 不需換管道，可降低延遲 | 間隔時間無法保證 QQ 完全不延遲 |
| **D** | 全部 Resend batch，靠 webhook 補寄 | 最少額外工作，已有現成機制 | QQ/163 收信可能延遲幾分鐘到幾小時 |

---

## 五、建議做法（方案 C + D 混用）

1. **非 QQ/163（150 人）**：直接 Resend batch，一次送完
2. **QQ/163（165 人）**：Resend batch，每批 10~15 封，批次間隔 30~60 秒，約 10~16 分鐘送完
3. **延遲補寄**：靠現有 webhook 機制，`delivery_delayed` 自動觸發 Gmail 補寄 1 次
4. **仍失敗**：手動用阿里雲補寄（每日 100 封上限內處理殘餘少量）

### QQ/163 分批估算

- 165 封 ÷ 15 封/批 = 11 批
- 間隔 45 秒 → 總計約 **8 分鐘**

---

## 六、注意事項

- `delivery_delayed` 不等於寄失敗，Resend 仍會繼續重試
- 信件內容、寄件域名信譽、收件人是否曾互動都會影響 QQ 的投遞判斷
- 阿里雲 SMTP 每日額度用完後需等隔天重置
- 兩個管道都只能確認「接受」，無法即時確認「送達」
