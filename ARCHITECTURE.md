# 架構說明 — satipatthana-reg

第二屆台灣四念處禪修課程線上報名 / 食宿 / 共修 / 互動系統。

---

## 技術棧

| 層 | 用的是 |
|---|---|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 語言 | TypeScript, React 19 |
| 樣式 | Tailwind CSS v4 |
| 資料庫 / Auth | Supabase (Postgres) |
| 檔案儲存 | Supabase Storage（buckets：`qr-codes` public、`lodging-docs` public、`site-assets` public、`pledge` private） |
| 寄信 | **Resend**（[lib/mailer.ts](lib/mailer.ts)；單封 + 批次 ≤100/call） |
| 金流 | 綠界 ECPay (信用卡) + 銀行匯款 |
| 託管 | Vercel（自動從 GitHub 部署） |
| 版控 | GitHub `dharmaworker/satipatthana-reg` |

---

## 頁面路由

### 公開
| Path | 用途 |
|---|---|
| `/` | 報名表單（含 LINE/WeChat QR 上傳） |
| `/register/success` | 報名成功 |
| `/query` | 查狀態；已錄取未繳費顯示「前往繳費」按鈕 |
| `/pay?id=&code=` | 選方案（A1~D2 + 測試 T1/T2），刷卡 or 匯款登記 |
| `/info/schedule` | 課程時間表（讀 `site_config`） |
| `/info/payment` | 繳費資訊說明 |
| `/lodging?id=&code=` | 食宿登記表（含證件 / 機票 / 快篩上傳） |
| `/lodging/success` | 食宿登記成功 |
| `/quicktests?id=&code=` | 補上傳快篩結果照片 |
| `/quicktests/success` | 快篩上傳成功 |

### 學員（cookie `member_email` + `member_id`，24h）
| Path | 用途 |
|---|---|
| `/member` | 學員登入 |
| `/member/dashboard` | 學員個人資訊 |
| `/member/practice` | 課前共修打卡（限改 3 次；未打卡 ≥3 堂該欄位不計參課資格） |
| `/member/interactive` | 互動課程意願登記（集體 / 分組） |
| `/member/course-checkin` | 線上學員逐場次打卡（對應 `course_sessions`） |

### 後台（cookie `admin_role` + `admin_username`，8h）
| Path | 用途 |
|---|---|
| `/admin/login` | 後台登入 |
| `/admin/dashboard` | 報名管理（編輯/刪除/QR modal、狀態下拉、批次寄信、匯出） |
| `/admin/lodgings` | 食宿登記管理（檢視 / 編輯 / 證件下載） |
| `/admin/timetable` | 編輯課程時間表（存 `site_config`，自動同步 `course_sessions`） |
| `/admin/schedules` | 排程匯出設定（`scheduled_exports`） |
| `/admin/practice` | 共修課表設定（`practice_config` + `practice_schedule`） |
| `/admin/practice-records` | 共修打卡紀錄查詢 |
| `/admin/interactive` | 互動分組分配 / 批次抽籤 / 寄通知 |
| `/admin/interactive-tasks` | 互動學員作業檢視 |
| `/admin/attendance-records` | 課程簽到 / 完成度紀錄 |
| `/admin/quicktests` | 快篩繳交狀況 |
| `/admin/documents` | 學員文件總覽（QR / 證件 / 機票 / 快篩） |

---

## API 路由

`app/api/**/route.ts`，全部走 `supabaseAdmin` (service_role) 繞 RLS。

### 公開 API
| 方法 | Path | 功能 |
|---|---|---|
| POST | `/api/register` | 送出報名，產 `random_code`，寄學員確認信 + 學會備存信 |
| POST | `/api/upload-qr` | 上傳 LINE/WeChat QR 到 `qr-codes` bucket，回 public URL |
| POST | `/api/upload-lodging` | 上傳身分證 / 護照 / ARC / 機票 / 快篩到 `lodging-docs` bucket |
| POST | `/api/query` | Email + random_code 查狀態（回含 id） |
| POST | `/api/lodging` | 送出 / 更新食宿登記（`lodging_registrations`） |
| POST | `/api/quicktests` | 補上傳快篩 |
| GET | `/api/timetable` | 讀課程時間表 |
| GET | `/api/interactive` POST `/api/interactive`、`/api/interactive/task` | 學員端互動意願 + 作業填寫 |
| GET | `/api/pledge` | 從 private bucket `pledge` 串流承諾書（須 id+code+approved gate） |
| POST | `/api/member/login` / GET `/api/member/me` / POST `/api/member/resend-code` | 學員 session |
| GET/POST | `/api/member/practice` | 學員端共修打卡（GET 取資料、POST 切換 checked） |
| GET/POST | `/api/member/course-checkin` | 學員端逐場次打卡 |
| POST | `/api/payment/create` | 寫入 plan，組綠界自動提交 form（`status='approved'`） |
| POST | `/api/payment/callback` | 綠界 S2S：驗 `CheckMacValue` → `payment_status='verified'`，寄食宿登記信 |
| POST | `/api/payment/transfer` | 匯款後填後五碼 → `payment_status='paid'`，寄食宿登記信 |

### 後台 API（cookie `admin_role` 驗證）
| 方法 | Path | 功能 |
|---|---|---|
| POST | `/api/admin/login` | 管理員登入 |
| GET / PATCH / DELETE | `/api/admin/registrations` | 列表 / 更新 / 刪除（含同步刪 Storage 上的 QR + 食宿檔） |
| POST | `/api/admin/batch` | 批次刪除 / 批次操作 |
| GET | `/api/admin/export` / `/api/admin/export-now` | 匯出 CSV（UTF-8 BOM）/ 立即跑排程匯出 |
| POST | `/api/admin/cron/run-exports` | 排程觸發點（Vercel Cron） |
| GET / POST / PATCH / DELETE | `/api/admin/schedules` | 排程匯出 CRUD |
| GET / PATCH | `/api/admin/lodgings` | 食宿登記列表 / 修改 |
| GET / POST | `/api/admin/timetable` | 讀寫課程時間表（POST 會自動同步 `course_sessions`） |
| GET / PATCH | `/api/admin/course-sessions` | 場次列表（含打卡統計） / 切 `requires_checkin` |
| GET / POST / PATCH | `/api/admin/practice` + `/api/admin/practice/checkins` | 共修設定、課表、打卡紀錄 |
| GET / PATCH | `/api/admin/interactive` | 互動分配 |
| POST | `/api/admin/interactive/batch-assign` | 批次抽籤分配 |
| POST | `/api/admin/interactive/notify` | 寄中籤通知 |
| GET | `/api/admin/interactive-tasks` | 學員互動作業匯總 |
| GET / POST | `/api/admin/interactive-config` | 互動場次 / 老師 / 名額設定 |
| POST | `/api/admin/send-notifications` | 批次手動寄錄取通知（admin） |
| POST | `/api/admin/send-formal-notifications` | 寄正式報名通知 |
| POST | `/api/admin/send-attendance-notify` | 寄出席率通知 |
| POST | `/api/admin/send-interactive-invite` | 寄互動報名邀請 |
| POST | `/api/admin/send-student-id` | 寄學號通知 |
| POST | `/api/admin/send-timetable-notify` | 寄時間表更新通知 |
| POST | `/api/admin/preview-test-student` | 產一筆測試學員資料 |
| POST | `/api/admin/test-email` | 寄測試信 |

---

## 資料模型

主 schema [supabase/schema.sql](supabase/schema.sql) + 分檔：[practice.sql](supabase/practice.sql) / [interactive.sql](supabase/interactive.sql) / [attendance_checkins.sql](supabase/attendance_checkins.sql) / [site_config.sql](supabase/site_config.sql)。`course_sessions` / `course_session_checkins` 由 timetable 同步邏輯維護（[lib/timetable.ts](lib/timetable.ts) `syncCourseSessions`）。

### `registrations`（主表）
- **識別**：`id` (uuid PK)、`random_code` (unique 8 碼)、`member_id`（序號 `T-001/T-002`，錄取時自動編）、`student_id`（學號 `R-001/R-002`，食宿頁手動編）
- **基本資料**：`chinese_name` / `passport_name` / `identity` / `dharma_name` / `gender` / `age` / `passport_country` / `residence` / `phone` / `email` (unique)
- **通訊**：`line_id` / `wechat_id` + `line_qr_url` / `wechat_qr_url`（指向 `qr-codes` bucket public URL；擇一必填）
- **報名條件**（布林）：`honest_confirm`、`attended_formal`、`watched_recordings`、`zoom_guidance`、`watched_30_talks`、`keep_precepts`、`pay_confirm`、`health_confirm`
- **背景**：`practice_years` / `practice_frequency` / `mental_health_note` / `retreat_format`（`in_person` | `online`）/ `attended_courses` (jsonb)
- **狀態機**：
  - `status`: `pending` → `approved` / `rejected`
  - `payment_status`: `unpaid` → `paid` → `verified`
- **繳費**：`payment_plan`（`A1`~`D2` / `T1` / `T2`）、`payment_note`、`payment_confirmed_at`

### `admin_users`
`username` / `password_hash`（SHA256(password + PASSWORD_SALT)）/ `role` / `name`。

| Role | 列表/匯出 | status / member_id | payment_status / plan | 基本資料 / QR | 寄錄取信 | 刪除 |
|---|---|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reviewer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `finance` | ✅ | ❌ | ✅ (status) | ❌ | ❌ | ❌ |
| `readonly` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### `lodging_registrations`（與 registration 1:1, ON DELETE CASCADE）
- 抵離日期 / 繳費方式（由 `payment_plan` 推導）
- 緊急聯絡人 / 交通 / 接駁巴士目的地
- 飲食（`meat`/`vegetarian`）/ 過午不食 / 點心 / 8/19 + 8/24 晚餐 / 打鼾 / 防疫同意
- 證件：`id_front_url` / `id_back_url`（台灣人）、`passport_url`（外籍短期）、`arc_url`（ARC）、`photo_url`、`arrival_ticket_url` / `departure_ticket_url`
- 快篩：`test_0817_url` / `test_0819_url`（8/20 與 8/22 改現場繳交，不存 DB）
- 國外學員航班：`flight_arrival_date/time` / `flight_departure_date/time`

### 共修（`practice_*`）
- `practice_config` 單列：啟用、區間 label、Zoom 連結、備註
- `practice_schedule`：場次（日期 / 時間 / 標題 / 是否 live / 影片連結）
- `practice_checkins`：`(registration_id, schedule_item_id)` 唯一；欄位含 `checked`、`change_count`
- 規則：每筆 `change_count >= 3` 後不允許再切；前端 `/member/practice` 顯示「未打卡 ≥3 堂則該紀錄不計參課資格」

### 互動（`interactive_*`）
- `interactive_registrations`（PK = registration_id）：學員想要的（`wanted_sessions`、`wanted_ranking`） + admin 分配（`group_status` / `small_status` / `assigned_session` / `assigned_group` / `assigned_date` / `group_serial` / `small_serial` / `notification_sent_at`）
- `interactive_tasks`（PK = registration_id）：中籤後填的修行背景與問題

### 出席 / 場次打卡
- `attendance_checkins`：每位學員一列，`attendance_status` 為 `full` / `partial` / `absent`（[supabase/attendance_checkins.sql](supabase/attendance_checkins.sql)）
- `course_sessions`：由 `lib/timetable.ts` 從時間表自動同步（`sync_key = day{n}_row{r}`，欄位 `requires_checkin`、`day_number`、`session_date`、`time_label`、`title`、`sort_order`）
- `course_session_checkins`：`(session_id, registration_id)` per-場次紀錄（`status` = `present`/`absent`/`null`）

### 其他
- `scheduled_exports`：定時匯出排程（cron 跑 `/api/admin/cron/run-exports`）
- `site_config`：通用 key/value（JSONB），目前存 `timetable`

### Supabase Storage
| Bucket | 模式 | 用途 |
|---|---|---|
| `qr-codes` | public | LINE / WeChat QR；500KB；jpeg/png/webp；路徑 `<line\|wechat>/<uuid>.<ext>` |
| `lodging-docs` | public | 食宿登記證件 / 機票 / 快篩 |
| `site-assets` | public | 海報、教師照、LINE 圖（[lib/site-assets.ts](lib/site-assets.ts)） |
| `pledge` | **private** | 承諾書 PDF；走 `/api/pledge` gate（需 id+code+approved） |

刪除報名時 admin API 會同步清 `qr-codes` 與 `lodging-docs` 上的關聯檔。

---

## 驗證 / 授權

### 後台
- 登入：`POST /api/admin/login` → 比對 `admin_users.password_hash == SHA256(input + PASSWORD_SALT)`
- Session：httpOnly cookie `admin_role` + `admin_username`（8h）
- Dashboard 上 status / payment_status 為彩色下拉，編輯 modal 改基本資料 / 方案 / QR

### 學員
- 登入：`POST /api/member/login` → 比對 `email + random_code` 且 `payment_status='verified'`
- Session：httpOnly cookie `member_email` + `member_id`（24h）
- 各功能頁（`/lodging`、`/member/practice` 等）也支援 `?id=&code=` 帶參免登入存取

### RLS
所有表開 RLS，policy 只開給 `service_role`。Anon / authenticated 直連 DB 無權限。Service role bypass，所以 API 不受影響。

---

## 金流流程（綠界 / 匯款）

繳費方案：A1/A2 … D1/D2（正式）+ T1/T2（測試 1 / 30 元）。T2 因綠界最低額限制 30 元。

### 刷卡
1. `/pay` 選方案（A2/B2/C2/D2/T2）→ `POST /api/payment/create`
2. 後端檢 `status='approved'` → 寫 `payment_plan` → 組綠界參數（`baseUrl` 優先 `NEXT_PUBLIC_BASE_URL`，否則 request origin）→ 回 auto-submit form
3. 綠界完成刷卡 → S2S POST `/api/payment/callback`：驗 `CheckMacValue` → `payment_status='verified'` + `payment_confirmed_at`
4. 觸發**食宿登記確認信**

### 匯款
1. `/pay` 選方案（A1/B1/C1/D1/T1）→ 顯示銀行帳號
2. 同頁填後五碼 / 日期 / 匯款人 → `POST /api/payment/transfer`
3. 後端檢 `status='approved'` → 寫 `payment_status='paid'` + `payment_plan` + `payment_note`
4. 觸發食宿登記確認信
5. Admin 後台核對後 status 改 `verified` → 再觸發一次

---

## 寄信總表

[lib/mailer.ts](lib/mailer.ts)：**Resend** API。`from` 預設 `台灣四念處學會 <no-reply@satipatthana.org.tw>`（可用 `RESEND_FROM` 覆寫）。批次 `sendMailBatch` 切 100 封一批。

| 信件 | 模組 | 觸發點 | 收件 |
|---|---|---|---|
| 報名確認（學員） | inline `/api/register` | 報名成功 | 學員 |
| 報名備存（學會） | inline `/api/register` | 報名成功 | 學會 |
| 錄取通知 | [lib/approval-email.ts](lib/approval-email.ts) | status → approved 或批次 | 學員 + bcc 學會 |
| 食宿登記確認 | [lib/archive-email.ts](lib/archive-email.ts) | (a) 匯款回報 (b) 綠界 callback (c) PATCH `payment_plan` (d) PATCH `payment_status='verified'` | 學員 + bcc 學會 |
| 學號通知 | [lib/student-id-email.ts](lib/student-id-email.ts) | `/api/admin/send-student-id` | 學員 |
| 正式報名通知 | [lib/formal-notification-email.ts](lib/formal-notification-email.ts) | `/api/admin/send-formal-notifications` | 學員 |
| 出席率通知 | [lib/attendance-notify-email.ts](lib/attendance-notify-email.ts) | `/api/admin/send-attendance-notify` | 學員 |
| 互動邀請 | [lib/interactive-invite-email.ts](lib/interactive-invite-email.ts) | `/api/admin/send-interactive-invite` | 學員 |
| 互動中籤 | [lib/interactive-notify-email.ts](lib/interactive-notify-email.ts) | `/api/admin/interactive/notify` | 學員 |
| 時間表更新 | [lib/timetable-notify-email.ts](lib/timetable-notify-email.ts) | `/api/admin/send-timetable-notify` | 學員 |
| 快篩補繳通知 | [lib/quicktests-email.ts](lib/quicktests-email.ts) | `/api/quicktests` 等 | 學員 |

學會信箱預設 `satipatthana.taipei@gmail.com`，可用 `ARCHIVE_EMAIL` 覆寫。寄信失敗皆只 log，不讓主 API 失敗。

---

## 環境變數

本機：`.env.local`（範本 [.env.local.example](.env.local.example)）。線上：Vercel → Project Settings → Environment Variables（Production / Preview / Development 都勾）。

**必填**：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`（`sb_publishable_...`）
- `SUPABASE_SERVICE_ROLE_KEY`（`sb_secret_...`）
- `PASSWORD_SALT`（後台密碼 hash 用，本機 / Vercel 必須一致）
- `RESEND_API_KEY`（寄信主通道）

**功能需要**：
- `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` / `ECPAY_PAYMENT_URL` — 綠界

**建議**：
- `NEXT_PUBLIC_BASE_URL` — 確保信中連結、綠界 ReturnURL/ClientBackURL 對得上
- `ARCHIVE_EMAIL` — 備存 / BCC 收件信箱（預設 `satipatthana.taipei@gmail.com`）
- `RESEND_FROM` — 自訂寄件者（預設 `台灣四念處學會 <no-reply@satipatthana.org.tw>`）

**已淘汰**：`GMAIL_USER` / `GMAIL_APP_PASSWORD`（已全面換 Resend，commit 50095c6）。

---

## 部署

1. Vercel 接 GitHub `dharmaworker/satipatthana-reg`
2. 推 `main` → 自動 production build
3. 推其他分支 → 自動 Preview
4. 改 env 後**務必 Redeploy**
5. Production: `https://satipatthana-reg-eihf.vercel.app`（與 `NEXT_PUBLIC_BASE_URL` 對齊）
6. 排程匯出走 Vercel Cron 打 `/api/admin/cron/run-exports`

---

## 本機開發

```bash
cd satipatthana-reg
nvm use 20   # 或 nvm install 20
npm install
cp .env.local.example .env.local
# 編輯 .env.local 填 Supabase / RESEND / PASSWORD_SALT 等
npm run dev       # http://localhost:3000
```

---

## 管理腳本

放在 [scripts/](scripts/)，均用 service_role key 直連 DB。

| Script | 用途 |
|---|---|
| `check-supabase.mjs` | 驗證連線 / table / RLS |
| `check-admin-users.mjs` | 列出所有 admin_users |
| `setup-admin.mjs` | 初始化唯一管理員（⚠️ 清空 `admin_users`） |
| `add-admin.mjs` | 新增 / 更新單一管理員（upsert） |
| `test-role.mjs` | 用指定帳密依序打 admin API 驗權限 |
| `test-mail.mjs` | 寄測試信驗 Resend credential |
| `check-lodging*.mjs` | 食宿表結構 / nullable / setup 驗證 |
| `debug-lodging-timestamps.mjs` / `reset-lodging-updated-at.mjs` | 食宿時戳 debug / 重設 |
| `move-pledge-private.mjs` | 把承諾書搬到 private bucket |
| `upload-pledge.mjs` / `upload-site-assets.mjs` / `upload-location-maps.mjs` | 上傳資產 |
| `generate-content-xlsx.js` | 產內容 xlsx |
| `copy-data.js` | 跨環境複製資料 |
| `check-test-columns-dropped.mjs` | 驗證測試欄位已下架 |

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
- 編輯 modal：姓名 / Email / 居住地 / 學號 / 方案 / LINE QR / WeChat QR
- 刪除：admin only，hard delete + 同步清 `qr-codes` 與 `lodging-docs`
- 編號按鈕：`payment_status='verified'` 且無 `member_id` 時出現，自動編 `T-NNN`
- QR 縮圖：點開放大 modal（下載、新分頁）
- 批次寄錄取通知 / 批次寄正式通知 / 批次寄學號 / 批次寄出席率通知 / 批次寄互動邀請 / 批次寄時間表通知
- 匯出 CSV：含所有欄位（報名條件 / QR / 方案 / 狀態 / 備註）
- 排程匯出：`/admin/schedules` 設定每日寄 Excel

---

## 已知待辦

- [ ] 手機版完整流程實機驗證（iPhone Safari / Android Chrome）
- [ ] 確認 Vercel 的 `ARCHIVE_EMAIL` / `NEXT_PUBLIC_BASE_URL` / `RESEND_API_KEY` 已正確設置
- [ ] 舊 `unpaid` 但實際已刷卡成功的報名，需後台手動改 `verified`
- [ ] auto-send 普及後評估批次寄信按鈕是否保留
