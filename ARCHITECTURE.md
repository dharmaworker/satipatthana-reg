# 架構說明 — satipatthana-reg

第二屆台灣四念處禪修課程線上報名系統。

---

## 技術棧

| 層 | 用的是 |
|---|---|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 語言 | TypeScript, React 19 |
| 樣式 | Tailwind CSS v4 |
| 資料庫 / Auth | Supabase (Postgres) |
| 檔案儲存 | Supabase Storage（bucket `qr-codes`，public） |
| 寄信 | Gmail SMTP (Nodemailer) + Resend 備援 |
| 金流 | 綠界 ECPay (信用卡) + 銀行匯款 |
| 託管 | Vercel（自動從 GitHub 部署） |
| 版控 | GitHub `dharmaworker/satipatthana-reg` |

---

## 頁面路由

| Path | 用途 | 誰看得到 |
|---|---|---|
| `/` | 報名表單（含 LINE/WeChat QR 上傳） | 公開 |
| `/register/success` | 報名成功畫面 | 公開 |
| `/query` | 查狀態；已錄取未繳費時顯示「前往繳費」按鈕 | 公開 |
| `/pay?id=&code=` | 選方案（A1~D2 + 測試 T1/T2），刷卡 or 匯款登記 | 公開（須帶參數） |
| `/member` | 學員登入 | 公開 |
| `/member/dashboard` | 學員個人資訊 | 需登入（cookie） |
| `/info/schedule` | 課程時間表 | 公開 |
| `/info/payment` | 繳費資訊說明 | 公開 |
| `/admin/login` | 後台登入 | 公開 |
| `/admin/dashboard` | 後台報名管理（含編輯/刪除/QR 檢視 modal） | 需登入（cookie） |

---

## API 路由

`app/api/**/route.ts`，全部用 `supabaseAdmin` (service_role) 繞過 RLS。

### 公開 API
| 方法 | Path | 功能 |
|---|---|---|
| POST | `/api/register` | 送出報名，產生唯一 `random_code`，同時寄**確認信給學員** + 寄**備存信給學會** |
| POST | `/api/upload-qr` | 接收圖片並上傳到 Supabase Storage `qr-codes`，回傳 public URL |
| POST | `/api/query` | 用 Email + random_code 查狀態（回傳含 id，方便後續繳費） |
| POST | `/api/member/login` | 學員登入 |
| GET | `/api/member/me` | 讀當前登入學員 |
| POST | `/api/payment/create` | 記錄 plan、組綠界參數，回傳自動提交 form（須 `status='approved'`） |
| POST | `/api/payment/callback` | 綠界 S2S 通知。成功後把 `payment_status` 設為 `verified`，寄食宿登記信 |
| POST | `/api/payment/transfer` | 匯款後回填後五碼（須 `status='approved'`）。寫入後寄食宿登記信 |

### 後台 API（cookie `admin_role` 驗證）
| 方法 | Path | 功能 |
|---|---|---|
| POST | `/api/admin/login` | 管理員登入，設 `admin_role` / `admin_username` cookie |
| GET | `/api/admin/registrations` | 列表（支援 status / search filter） |
| PATCH | `/api/admin/registrations` | 更新：status / member_id / payment_status / payment_plan / 基本資料 / QR。觸發自動寄信（見下） |
| DELETE | `/api/admin/registrations` | 刪除報名，一併刪除 Storage 上的 QR 圖檔（僅 admin） |
| POST | `/api/admin/send-notifications` | 批次手動寄錄取通知信（僅 admin） |
| GET | `/api/admin/export` | 匯出 CSV（UTF-8 BOM for Excel） |

---

## 資料模型

見 [supabase/schema.sql](supabase/schema.sql)。

### `registrations`
主表：
- **識別**：`id` (uuid PK)、`random_code` (unique 8 碼)、`member_id` (`TW2026-XXX`)
- **基本資料**：`chinese_name`、`passport_name`、`gender`、`age`、`residence`、`phone`、`email` (unique)...
- **通訊**：`line_id` / `wechat_id` + `line_qr_url` / `wechat_qr_url`（指向 Supabase Storage public URL；擇一必填）
- **報名條件**（布林）：`honest_confirm`、`attended_formal`、`watched_recordings`、`zoom_guidance`、`watched_30_talks`、`keep_precepts`、`pay_confirm`、`health_confirm`
- **狀態機**：
  - `status`: `pending` → `approved` / `rejected`
  - `payment_status`: `unpaid` → `paid` → `verified`
- **繳費**：`payment_plan`（`A1`~`D2` / `T1` / `T2`）、`payment_note`（匯款資訊）、`payment_confirmed_at`
- `attended_courses`: jsonb array

### `admin_users`
後台管理員。欄位：`username`、`password_hash`（SHA256(password + PASSWORD_SALT)）、`role`、`name`。

| Role | 列表/匯出 | 改 status / member_id | 改 payment_status / plan | 改基本資料 / QR | 寄錄取信 | 刪除 |
|---|---|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reviewer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `finance` | ✅ | ❌ | ✅ (status) | ❌ | ❌ | ❌ |
| `readonly` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

備註：`payment_plan` 目前歸 admin only（編輯 modal 修正用）。

### Supabase Storage
- Bucket: `qr-codes`（public）
- 大小上限 500KB
- 接受型別：`image/jpeg`、`image/png`、`image/webp`
- 路徑：`<kind>/<uuid>.<ext>`（kind = `line` / `wechat`）
- 刪除報名時會同步刪檔

---

## 驗證 / 授權

### 後台管理員
- 登入：`POST /api/admin/login` → 比對 `admin_users.password_hash` == `SHA256(input + PASSWORD_SALT)`
- Session：httpOnly cookie `admin_role` + `admin_username`（8 小時）
- Dashboard UI 上 status / payment_status 為彩色下拉，隨時可切換；基本資料與方案改用編輯 modal

### 學員
- 登入：`POST /api/member/login` → 比對 `email + random_code`，且 `payment_status='verified'`
- Session：httpOnly cookie `member_email` + `member_id`（24 小時）
- 學員也可直接用 `/query` 輸入 Email + random_code 查狀態 → 錄取且未繳費時按「前往繳費」進入 `/pay`

### RLS
兩張表皆**應啟用 RLS**（service_role bypass，不影響程式）。啟用 SQL：
```sql
alter table registrations enable row level security;
alter table admin_users enable row level security;
```

---

## 金流流程（綠界 / 匯款）

繳費方案：A1/A2 … D1/D2（正式）+ T1/T2（測試 1 / 30 元）。T2 因綠界最低額限制為 30 元。

### 刷卡
1. 學員在 `/pay` 選方案（A2/B2/C2/D2/T2）→ `POST /api/payment/create`
2. 後端檢查 `status='approved'` → 把 plan 寫入 `payment_plan` → 組綠界參數（`baseUrl` 優先讀 `NEXT_PUBLIC_BASE_URL`，否則用 request origin）→ 回傳自動 submit HTML
3. 學員在綠界完成信用卡付款
4. 綠界 S2S POST 到 `/api/payment/callback`：驗 `CheckMacValue` → `payment_status='verified'` + `payment_confirmed_at`
5. 觸發**食宿登記確認信**（寄學員 + bcc 學會）

### 匯款
1. 學員在 `/pay` 選方案（A1/B1/C1/D1/T1）→ 顯示銀行帳號
2. 匯款後在同頁填：後五碼、日期、匯款人 → `POST /api/payment/transfer`
3. 後端 `status='approved'` 檢查 → 寫入 `payment_status='paid'` + `payment_plan` + `payment_note`
4. 觸發**食宿登記確認信**（寄學員 + bcc 學會）
5. 管理員後台核對後把 `payment_status` 下拉改 `verified` → 再觸發一次食宿登記信

---

## 寄信總表

[lib/mailer.ts](lib/mailer.ts)：Gmail SMTP (`smtp.gmail.com:587`)，寄件者 `台灣四念處學會 <${GMAIL_USER}>`。

模板與觸發點：

| 信件 | 寄件模組 | 觸發點 | 收件人 |
|---|---|---|---|
| 報名確認（學員收的） | inline in `/api/register` | 報名成功 | `to: 學員` |
| 報名備存 | inline in `/api/register` | 報名成功 | `to: 學會` |
| 錄取通知 | [lib/approval-email.ts](lib/approval-email.ts) | 後台 status → approved 或手動批次寄送 | `to: 學員` + `bcc: 學會` |
| 食宿登記確認 | [lib/archive-email.ts](lib/archive-email.ts) | (a) 匯款回報 (b) 綠界 callback 成功 (c) PATCH 修改 `payment_plan` (d) PATCH payment_status → verified | `to: 學員` + `bcc: 學會` |

學會信箱預設 `satipatthana.taipei@gmail.com`，可用 `ARCHIVE_EMAIL` 環境變數覆寫。  
所有寄信失敗皆只 log、不會讓主 API 失敗。

---

## 環境變數

本機：`.env.local`（範本 [.env.local.example](.env.local.example)）  
線上：Vercel → Project Settings → Environment Variables（Production / Preview / Development 都勾）

**必填**：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`（新版 `sb_publishable_...`）
- `SUPABASE_SERVICE_ROLE_KEY`（新版 `sb_secret_...`）
- `PASSWORD_SALT`（後台密碼 hash 用，本機 / Vercel 值**必須一致**）

**功能需要**：
- `GMAIL_USER` / `GMAIL_APP_PASSWORD`（兩步驟驗證下的應用程式密碼）— 寄信
- `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` / `ECPAY_PAYMENT_URL` — 綠界

**建議設**：
- `NEXT_PUBLIC_BASE_URL` — 確保錄取信連結、綠界 ReturnURL / ClientBackURL 指向正確網域。沒設時會自動用 request origin
- `ARCHIVE_EMAIL` — 備存/BCC 收件信箱（預設 `satipatthana.taipei@gmail.com`）

**選用**：
- `RESEND_API_KEY`

---

## 部署

1. Vercel 專案接 GitHub `dharmaworker/satipatthana-reg`
2. 推到 `main` → 自動觸發 production build
3. 推到其他分支（例如 `dev/dharmaworker`）→ 自動建立 Preview 部署
4. 改 env 後**務必 Redeploy**，env 變更不會套用到既有 deployment
5. 實際 production 網址：`https://satipatthana-reg-eihf.vercel.app`（請確認此值與 `NEXT_PUBLIC_BASE_URL` 一致）

---

## 本機開發

```bash
# 1. 切到專案並安裝套件（需要 Node 20+，專案有 nvm 設定）
cd satipatthana-reg
nvm use 20   # 或 nvm install 20
npm install

# 2. 設環境變數
cp .env.local.example .env.local
# 編輯 .env.local 填入 Supabase URL / keys / PASSWORD_SALT 等

# 3. 啟 dev server
npm run dev       # http://localhost:3000
```

---

## 管理腳本

放在 [scripts/](scripts/)，均用 service_role key 直接連 DB。

| Script | 用途 |
|---|---|
| `check-supabase.mjs` | 驗證連線、table 存在、RLS 是否擋住 anon |
| `check-admin-users.mjs` | 列出所有 admin_users（驗證 role/hash） |
| `setup-admin.mjs` | 初始化唯一管理員（⚠️ 會清空 `admin_users`） |
| `add-admin.mjs` | 新增 / 更新單一管理員（upsert），不動其他帳號 |
| `test-role.mjs` | 以指定帳密登入並依序打 admin API，驗證角色權限 |
| `test-mail.mjs` | 用 `.env.local` 的 Gmail 設定寄測試信，驗 credential |

執行範例：
```bash
node scripts/check-supabase.mjs
node scripts/add-admin.mjs sati_viewer <密碼> 檢視員 readonly
node scripts/test-role.mjs sati_viewer <密碼>
node scripts/test-mail.mjs you@example.com
```

---

## 後台 Dashboard 功能摘要

- 統計卡：總報名 / 審核中 / 已錄取 / 未錄取 / 已繳費
- 搜尋：姓名 / Email / 繳費碼
- 篩選：審核狀態
- 列表欄：報名時間、姓名、Email、居住地、繳費碼、審核狀態（下拉）、繳費狀態（下拉）、學號、方案、QR（縮圖）、操作
- 狀態下拉：隨時切換 `pending` / `approved` / `rejected`，權限不足會跳錯誤
- 繳費下拉：同上（`unpaid` / `paid` / `verified`）
- 編輯按鈕：開 modal 可改 姓名 / Email / 居住地 / 學號 / 方案 / LINE QR / WeChat QR
- 刪除按鈕：admin only，hard delete + 清 Storage
- 編號按鈕：`payment_status='verified'` 且無 `member_id` 時出現，點擊自動編學號
- QR 縮圖：點擊開啟放大 modal（下載、新分頁開啟）
- 批次寄錄取通知：勾選 approved 者後一次寄送（通常配合自動寄信功能不常用）
- 匯出 CSV：含所有欄位（報名條件 / QR 連結 / 方案 / 狀態 / 備註）

---

## 已知待辦

- [ ] 手機版完整流程實機驗證（iPhone Safari / Android Chrome）
- [ ] 確認 Vercel 的 `ARCHIVE_EMAIL` / `NEXT_PUBLIC_BASE_URL` 已正確設置
- [ ] 舊的卡在 `unpaid` 但實際已刷卡成功的報名，需手動後台改 `verified`（新 reg 會自動更新）
- [ ] 手動批次寄錄取通知按鈕在 auto-send 普及後評估是否保留
