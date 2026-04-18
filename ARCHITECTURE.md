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
| 寄信 | Gmail SMTP (Nodemailer) + Resend 備援 |
| 金流 | 綠界 ECPay (信用卡) + 銀行匯款 |
| 託管 | Vercel（自動從 GitHub 部署） |
| 版控 | GitHub `dharmaworker/satipatthana-reg` |

---

## 頁面路由

| Path | 用途 | 誰看得到 |
|---|---|---|
| `/` | 報名表單 | 公開 |
| `/register/success` | 報名成功畫面 | 公開 |
| `/query` | 查詢報名/繳費狀態（Email + 繳費碼） | 公開 |
| `/pay?id=&code=` | 選方案、刷卡 or 匯款登記 | 公開（須帶參數） |
| `/member` | 學員登入 | 公開 |
| `/member/dashboard` | 學員個人資訊 | 需登入（cookie） |
| `/info/schedule` | 課程時間表 | 公開 |
| `/info/payment` | 繳費資訊說明 | 公開 |
| `/admin/login` | 後台登入 | 公開 |
| `/admin/dashboard` | 後台報名管理 | 需登入（cookie） |

---

## API 路由

`app/api/**/route.ts`，全部用 `supabaseAdmin` (service_role) 繞過 RLS。

### 公開 API
| 方法 | Path | 功能 |
|---|---|---|
| POST | `/api/register` | 送出報名，產生唯一 random_code |
| POST | `/api/query` | 用 Email + random_code 查狀態 |
| POST | `/api/member/login` | 學員登入（Email + random_code） |
| GET | `/api/member/me` | 讀當前登入學員資料（cookie） |
| POST | `/api/payment/create` | 開綠界訂單，回傳自動提交 form |
| POST | `/api/payment/callback` | 綠界 server-to-server 通知 |
| POST | `/api/payment/transfer` | 匯款後回填後五碼 |

### 後台 API（cookie `admin_role` 驗證）
| 方法 | Path | 功能 |
|---|---|---|
| POST | `/api/admin/login` | 管理員登入，設 `admin_role` / `admin_username` cookie |
| GET | `/api/admin/registrations` | 列表（支援 status/search filter） |
| PATCH | `/api/admin/registrations` | 更新狀態/繳費/學號 |
| POST | `/api/admin/send-notifications` | 批次寄錄取通知信 |
| GET | `/api/admin/export` | 匯出 CSV（UTF-8 BOM for Excel） |

---

## 資料模型

見 [supabase/schema.sql](supabase/schema.sql)。

### `registrations`
報名資料主表，欄位分幾類：
- **識別**：`id` (uuid PK)、`random_code` (unique 8碼)、`member_id` (`TW2026-XXX`)
- **基本資料**：`chinese_name`、`passport_name`、`gender`、`age`、`residence`、`phone`、`email` (unique)...
- **報名條件**（布林）：`honest_confirm`、`attended_formal`、`watched_recordings`、`zoom_guidance`、`watched_30_talks`、`keep_precepts`、`pay_confirm`、`health_confirm`
- **狀態機**：
  - `status`: `pending` → `approved` / `rejected`
  - `payment_status`: `unpaid` → `paid` → `verified`
- **繳費**：`payment_note`（匯款資訊）、`payment_confirmed_at`
- `attended_courses`: jsonb array（過往參加過的課程）

### `admin_users`
後台管理員。欄位：`username`、`password_hash`（SHA256(password + PASSWORD_SALT)）、`role`、`name`。

| Role | 列表 / 匯出 | 改 status / member_id | 改 payment_status | 寄通知信 |
|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `reviewer` | ✅ | ✅ | ❌ | ❌ |
| `finance` | ✅ | ❌ | ✅ | ❌ |
| `readonly` | ✅ | ❌ | ❌ | ❌ |

---

## 驗證 / 授權

### 後台管理員
- 登入：`POST /api/admin/login` → 比對 `admin_users.password_hash` == `SHA256(input + PASSWORD_SALT)`
- Session：httpOnly cookie `admin_role` + `admin_username`（8 小時）
- 檢查：各 API 讀 cookie `admin_role`，`readonly` / `finance` 某些寫操作被拒

### 學員
- 登入：`POST /api/member/login` → 比對 `email + random_code`，且 `payment_status='verified'`
- Session：httpOnly cookie `member_email` + `member_id`（24 小時）

### RLS
- `registrations` 和 `admin_users` **都應該啟用 RLS**（service_role key 不受影響）
- 目前**未啟用**，屬於已知問題，需在 Supabase SQL Editor 執行：
  ```sql
  alter table registrations enable row level security;
  alter table admin_users enable row level security;
  ```

---

## 金流流程（綠界）

1. 學員在 `/pay` 選方案 → `POST /api/payment/create`
2. server 組綠界參數（含 `CheckMacValue` 簽章）→ 回傳 HTML 自動 submit 到綠界
3. 學員在綠界完成信用卡付款
4. 綠界 S2S callback 打 `/api/payment/callback`
   - 驗證 `CheckMacValue`
   - 更新 `payment_status='verified'`、`payment_confirmed_at`
5. 匯款流程：學員在 `/pay` 按「我要匯款」→ 顯示銀行資訊 → 匯款後回填後五碼到 `/api/payment/transfer` → `payment_status='paid'` → 管理員手動在後台改成 `verified`

---

## 寄信

[lib/mailer.ts](lib/mailer.ts) — Gmail SMTP（`smtp.gmail.com:587`）。
- `GMAIL_USER` / `GMAIL_APP_PASSWORD`（Google 兩步驟驗證下的應用程式密碼）
- 從名：`台灣四念處學會`
- 用途：後台批次發錄取通知（含繳費連結 + 課程資訊）

Resend 套件已安裝但目前未使用，保留備援。

---

## 環境變數

本機：`.env.local`（範本 [.env.local.example](.env.local.example)）
線上：Vercel → Project Settings → Environment Variables

**必填**：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`（新版 `sb_publishable_...`）
- `SUPABASE_SERVICE_ROLE_KEY`（新版 `sb_secret_...`）
- `PASSWORD_SALT`（後台密碼 hash 用，本機 / Vercel 值**必須一致**）

**功能需要**：
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — 寄信
- `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` / `ECPAY_PAYMENT_URL` — 綠界
- `NEXT_PUBLIC_BASE_URL` — 信件裡的連結

**選用**：
- `RESEND_API_KEY`

---

## 部署

1. Vercel 專案連到 GitHub `dharmaworker/satipatthana-reg`
2. 推 commit 到 `main` 自動觸發 production build
3. 推到其他分支（如 `dev/dharmaworker`）自動建立 Preview 部署
4. 綠界 callback URL 必須是 production 網域（不能是 preview）

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

放在 [scripts/](scripts/)，用 service_role key 直接連 DB。

| Script | 用途 |
|---|---|
| `check-supabase.mjs` | 檢查連線、table 存在、RLS 狀態 |
| `setup-admin.mjs` | 建立 / 重設 `admin_users` 唯一管理員（自動產生 `PASSWORD_SALT`） |

執行：
```bash
node scripts/check-supabase.mjs
node scripts/setup-admin.mjs   # ⚠️ 會清空 admin_users 再寫入
```

---

## 已知待辦

- [ ] Supabase RLS 尚未啟用（anon key 可讀所有報名）
- [ ] Vercel 環境變數需逐一設定
- [ ] Vercel 部署紀錄中有失敗的 build，未診斷
- [ ] 後台寄信、綠界金流尚未在新 Supabase 上實測
- [ ] 手機版完整流程尚未完整驗證
