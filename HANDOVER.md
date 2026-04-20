# 交接文件 — satipatthana-reg

第二屆台灣四念處禪修課程線上報名系統。Next.js 16 + Supabase + Vercel。

---

## 外部服務與帳號

| 服務 | 用途 | 位置 |
|---|---|---|
| GitHub | 原始碼 | `dharmaworker/satipatthana-reg` |
| Vercel | 部署 | `https://satipatthana-reg-eihf.vercel.app` |
| Supabase | DB + Storage + Auth | `https://stjghujtfuhbbskgbjau.supabase.co` |
| Gmail SMTP | 寄信 | `satipatthana.tw@gmail.com`（寄件者） |
| Gmail 學會 | 備存 | `satipatthana.taipei@gmail.com`（BCC 收件） |
| ECPay 綠界 | 信用卡金流 | 商家 ID 存於 env |

---

## 核心流程

### 學員端
1. **報名** `/` — 填表 → `registrations` 產生 `random_code`
2. **查狀態** `/query` — Email + random_code 查審核/繳費狀態
3. **繳費** `/pay?id=&code=` — 錄取後，選方案 (A1~D2 / T1/T2 測試) → 匯款/刷卡
4. **食宿登記** `/lodging?id=&code=` — 填緊急聯絡人、飲食、交通、身分證/護照/機票、個人照
5. **快篩上傳** `/quicktests?id=&code=` — 4 時段快篩檢測結果圖

> **3、4、5 可任意順序進行，互不阻擋**。都只要 `status='approved'`。

### 後台
| 頁面 | 功能 |
|---|---|
| `/admin/login` | 登入 |
| `/admin/dashboard` | 報名管理（統計、搜尋、篩選、下拉改狀態、批次操作、編輯、詳細、⋯選單） |
| `/admin/lodgings` | 食宿登記管理（列表、詳細、編輯、檔案重傳） |
| `/admin/schedules` | 自動匯出排程 |

> `/admin/*` 經 `proxy.ts`（Next.js 16 的 middleware）擋下未登入者。

---

## 寄信流程（7 封）

| 觸發 | 信件 | 收件人 |
|---|---|---|
| 學員按「提交報名」 | 報名確認（含繳費碼） | to: 學員 |
| 同上 | 報名備存（完整資料表） | to: 學會 |
| 後台改 `status→approved`（或手動批次） | **錄取通知信 + PDF 附件**（含繳費/食宿/快篩 3 按鈕） | to: 學員, bcc: 學會 |
| `/pay` 匯款回填或綠界 callback 成功 | 食宿備存信（繳費 + 食宿摘要） | to: 學員, bcc: 學會 |
| 後台 PATCH payment_plan 改變或 payment_status→verified | 同上（食宿備存） | 同上 |
| `/lodging` 提交 | 食宿確認信（附快篩上傳連結） | to: 學員, bcc: 學會 |
| `/quicktests` 提交 | 快篩確認信 | to: 學員, bcc: 學會 |

寄件者固定 `台灣四念處學會 <${GMAIL_USER}>`。郵件代碼路徑：`lib/approval-email.ts`、`lib/archive-email.ts`、`lib/quicktests-email.ts`、`app/api/lodging/route.ts`（食宿確認信 inline）、`app/api/register/route.ts`（報名兩封 inline）。

---

## 後台角色矩陣

| Role | 列表 | 改 status/member_id | 改 payment | 改基本資料/QR/食宿 | 寄錄取信 | 刪除 |
|---|---|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reviewer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `finance` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `readonly` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

新增管理員：
```bash
node scripts/add-admin.mjs <username> <password> <name> <role>
```

---

## 資料庫

四張 table：

### `registrations`
報名主表。30+ 欄位，含識別 (`id`, `random_code`, `member_id`)、基本資料、報名條件（布林）、通訊（`line_id` / `wechat_id` + `line_qr_url` / `wechat_qr_url`）、狀態機（`status` / `payment_status` / `payment_plan` / `payment_note` / `payment_confirmed_at`）。

### `lodging_registrations`
食宿主表。**多數欄位 nullable**（允許分段提交）。一對一 FK → registrations（`ON DELETE CASCADE`）。欄位含：
- 方案（arrival_date/departure_date/payment_method） — 由 `payment_plan` 推導填入
- 緊急聯絡人、交通、飲食、餐點、打鼾、防疫承諾
- 檔案 URL：個人照、身分證正反、護照、來/離台機票、8/17 / 8/19 / 8/20 / 8/22 快篩共 10 個
- 航班資訊（抵/離台日期時間）

### `admin_users`
後台管理員。`password_hash = SHA256(password + PASSWORD_SALT)`。

### `scheduled_exports`
自動匯出排程。`scheduled_at` (timestamptz), `recipients` (text[]), `enabled`, `last_run_at`, `last_error`。最多 10 筆。

完整 schema 見 [supabase/schema.sql](supabase/schema.sql)。

---

## Storage Buckets

| Bucket | Public | 大小 | 用途 |
|---|---|---|---|
| `qr-codes` | ✅ | 500KB | 報名時 LINE/WeChat QR |
| `lodging-docs` | ✅ | 5MB | 食宿登記檔（身分證、護照、機票、照片、快篩，支援 PDF） |

---

## 環境變數

### 必填
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`（新版 `sb_publishable_...`）
- `SUPABASE_SERVICE_ROLE_KEY`（新版 `sb_secret_...`）
- `PASSWORD_SALT`（後台密碼 hash，**本機/Vercel 必須一致**）
- `GMAIL_USER` / `GMAIL_APP_PASSWORD`（Gmail 兩步驟下的應用程式密碼，16 字）
- `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` / `ECPAY_PAYMENT_URL`
- `CRON_SECRET`（Vercel Cron 呼叫時的 Bearer token）

### 建議設
- `NEXT_PUBLIC_BASE_URL` = `https://satipatthana-reg-eihf.vercel.app`
- `ARCHIVE_EMAIL` = `satipatthana.taipei@gmail.com`

改 env 後**必須 Redeploy**才生效。

---

## 硬截止時間 (程式碼中)

| 截止 | 位置 |
|---|---|
| 食宿登記 6/20 20:00 TPE | `app/lodging/page.tsx` + `app/api/lodging/route.ts` |
| 其他（繳費 6/15、報名 5/25、快篩時段）僅文字提示 | `lib/approval-email.ts` 內文、首頁提示 |

> 若日期要改，搜尋 `2026-06-20` / `2026-06-15` / `2026-05-25` 統一替換。

---

## 自動匯出排程

`vercel.json` cron 每天 `0 16 * * *` UTC = **00:00 台北** 觸發 `/api/admin/cron/run-exports`。檢查 `scheduled_exports` 找已到期未執行者，產 Excel 寄給該筆 `recipients`。

Excel 含 6 sheet：全部 / 待審核 / 已錄取未繳費 / 已繳費 / 未錄取 / **食宿登記**（後者有通訊 ID + QR 連結、繳費狀態+備註、檔案 URL）。

Cron endpoint 授權兩種擇一：`Authorization: Bearer $CRON_SECRET`（Vercel Cron 自動帶）或 `admin_role=admin` cookie（手動觸發按鈕）。

---

## 本機開發

```bash
# 1. Node 20+
nvm use 20

# 2. 安裝
cd satipatthana-reg
npm install

# 3. 環境變數
cp .env.local.example .env.local
# 編輯 .env.local 填四大類：Supabase / Gmail / ECPay / PASSWORD_SALT

# 4. 啟動
npm run dev  # http://localhost:3000
```

---

## 部署

- 推 `main` → Vercel production 自動 build
- 推其他分支 → Preview 部署
- 改 env → Redeploy 才生效
- 改 `vercel.json` / 新增 cron → 需一次部署才註冊

Vercel Cron 僅在 production 執行。

---

## 驗證 / 故障排除腳本

全部在 [scripts/](scripts/)：

| Script | 做什麼 |
|---|---|
| `check-supabase.mjs` | 連線 + RLS 檢查 |
| `check-admin-users.mjs` | 列出管理員（看 hash 前綴） |
| `check-lodging.mjs` | registrations 是否有 payment_plan 殘留 |
| `check-lodging-setup.mjs` | 驗證 bucket + 14 檔案欄位是否就位 |
| `check-lodging-nullable.mjs` | 驗證 lodging 欄位是否 nullable |
| `add-admin.mjs` | upsert 單一管理員 |
| `setup-admin.mjs` | ⚠️ 清空重建管理員 |
| `test-role.mjs` | 自動驗證角色權限 |
| `test-mail.mjs` | 寄測試信驗 Gmail credentials |

---

## 常見任務怎麼做

### 新增一個管理員
```bash
node scripts/add-admin.mjs sati_viewer MyPassword123 viewer readonly
```

### 改繳費截止日
搜尋 `2026-06-15` 整份 repo，統一改。主要在 `lib/approval-email.ts`、`lib/approval-pdf.tsx`。

### 新增食宿欄位
1. SQL `alter table lodging_registrations add column xxx text`
2. 更新 `supabase/schema.sql`
3. `/api/lodging/route.ts` POST allowed fields
4. `/lodging/page.tsx` form state + UI
5. `/admin/lodgings/page.tsx` 詳細 + 編輯 modal
6. `lib/export-excel.ts` LODGING_COLUMNS + transformLodgingRow

### 測整條流程
1. 首頁填報名（測試 Email 用自己的）
2. 收確認信（確認報名成功）
3. 後台 login → 改 status=approved → 自動寄錄取信（含 PDF 附件）
4. 點錄取信 ① 繳費 → 選 T1 測試方案 → 回填假後五碼
5. 收食宿備存信
6. 點錄取信 ② 食宿 → 填表送出
7. 收食宿確認信（含快篩連結）
8. 點連結 ③ 快篩 → 上傳圖 → 送出
9. 收快篩確認信
10. 後台 `/admin/lodgings` 看到全部資料、檔案、繳費明細

### 手動觸發匯出排程
`/admin/schedules` → 「立即執行（手動觸發）」

---

## 學員流程的硬規則

- 三個頁面（/pay、/lodging、/quicktests）**不互相依賴**，都獨立 `status='approved'` 即可使用
- 食宿登記可重複更新（onConflict upsert），6/20 前不限次數
- 快篩上傳可分次，每次只更新提交的時段，其他保留
- 暫時學號 `001-T` 格式，由 admin 在後台編號時產生（掃最大號 +1）

---

## 已知待辦

- [ ] Supabase RLS 啟用檢查（`alter table ... enable row level security`）
- [ ] 手機版實機驗證（iOS Safari / Android Chrome）
- [ ] 考慮加入 `lodging_registrations.contact_app` 欄位，避免每次用 line_id/wechat_id 推論

---

## 重要 Gotcha

- **Vercel 改 env 後必須 Redeploy**（env 是 build-time 嵌入，舊 deployment 不會載入新 env）
- **Vercel Hobby plan cron 只能每日一次**，想要更頻繁需升 Pro
- **Gmail App Password 需兩步驟驗證開啟**
- **綠界 callback URL 必須公開**，不能用 preview deployment（受 Vercel auth 保護）
- **Next.js 16 middleware 改名為 proxy**（專案用 `proxy.ts`）
- **logo 在 `public/logo.webp`**，首頁/success 頁用
- **CRON_SECRET 設了之後，手動按「立即執行」也仍然能用**（用 admin cookie 第二條通道）
- **學號清空（註銷）後號碼會回流**（下一個 assign 會重用該號）

---

## 關鍵日期 (2026)

| 項目 | 日期時間 |
|---|---|
| 報名開始 | 2026-05-11 10:00 |
| 報名截止 | 2026-05-25 22:00 |
| 錄取通知 | 2026-06-06 |
| 繳費截止 | 2026-06-15 20:00 |
| 食宿登記截止 | 2026-06-20 20:00 |
| 快篩 8/17 | 08:00-20:00 |
| 快篩 8/19 | 12:00 前 |
| 快篩 8/20 | 08:00 前 |
| 快篩 8/22 | 08:00 前 |
| 報到 | 2026-08-19 10:00（可提前 8/19 入住） |
| 課程 | 2026-08-20 ~ 08-24 |
| 結束 | 2026-08-24 17:30（可選 8/25 09:30 前離營） |

地點：南投日月潭湖畔會館，南投縣魚池鄉日月村中正路 101 號。
