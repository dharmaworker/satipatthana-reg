# Session Notes — satipatthana-reg

給新 Claude session 接手用的**精簡脈絡**。先看 [HANDOVER.md](HANDOVER.md) 了解全貌，這份只談做事時的慣例與最近決策。

---

## 一句話專案概述

第二屆台灣四念處禪修報名系統。學員：報名→錄取→繳費+食宿+快篩+共修+互動。後台：審核、管理、郵件佇列、自動匯出 Excel。架構 Next.js 16 App Router + Supabase + Vercel + Resend（主線）+ 阿里雲 SMTP（QQ/163）+ ECPay。

---

## 最近幾次重要決策

1. **先繳費再食宿**（2026-04-19 倒轉）— 原本食宿驅動方案，現在變成繳費頁選方案、食宿頁讀取
2. **三流程平行**（2026-04-20）— /pay /lodging /quicktests 不互相阻擋，任何順序都能做
3. **錄取信含三按鈕 + PDF 附件** — 錄取信用 @react-pdf/renderer 生成中文 PDF（Noto Sans TC 從 Google Fonts CDN 載入）
4. **快篩獨立頁** — 時程很晚（8/17 起），從食宿頁拆出來獨立 `/quicktests`
5. **學號格式 `001-T`** — 不是 `TW2026-001`（依委託人 PDF 規格）
6. **後台兩頁 tab 切換** — `/admin/dashboard` + `/admin/lodgings` 共用 `AdminHeader`
7. **後台列動作改 ⋯ 下拉** — 原本 5 顆按鈕過擠，只留「詳細 / 編輯 / ⋯」

---

## 程式碼慣例

- **Server Component 預設**，只在必要時加 `'use client'`
- **API routes** 都在 `app/api/**/route.ts`，用 `supabaseAdmin`（service_role）繞過 RLS
- **寄信** 走 `lib/mailer.ts` `sendMail()`，支援 `to`/`cc`/`bcc`/`attachments`
- **寄信失敗不中斷主 API**：`try { await sendMail(...) } catch (e) { console.error(...) }`
- **日期推導**：`lib/lodging-plan.ts` 的 `derivePaymentPlan` (dates→plan) 與 `planToLodgingDefaults` (plan→dates)
- **Edge proxy**（Next.js 16 的 middleware 改名）：`proxy.ts` 擋 `/admin/*` 未登入者
- **環境變數**：optional 的值用 `process.env.X || 'default'` pattern，必要的用 `!`
- **Markdown 文件**：不主動寫，除非使用者明說要（這次是例外）

---

## 檔案結構速查

```
lib/
  mailer.ts               sendMail / sendMailWithRetry / sendMailBatch（Resend 主；QQ/163→DB queue；Gmail 備援）
  alibaba-dm.ts           阿里雲 SMTP 送信（email_queue cron 用）
  mail-labels.ts          mail_type 中文標籤
  approval-email.ts       錄取信（to: 學員, bcc: 學會）
  archive-email.ts        食宿備存信（繳費事件觸發）
  quicktests-email.ts     快篩確認信
  student-id-email.ts     學號通知信
  formal-notification-email.ts  正式報名通知
  attendance-notify-email.ts    出席率通知
  interactive-invite-email.ts   互動邀請信
  interactive-notify-email.ts   互動中籤通知
  timetable-notify-email.ts     時間表更新通知
  group-join-email.ts           加入群組通知
  email-style.ts          共用信件 CSS
  export-excel.ts         產 6-sheet xlsx（exceljs）
  timetable.ts            時間表解析 + syncCourseSessions
  lodging-plan.ts         方案 <-> 日期/方式 推導
  registration-period.ts  報名/繳費階段設定（PHASE_DEFS）
  site-assets.ts          site-assets bucket 圖片 URL
  interactive.ts / interactive-db.ts / interactive-config.ts  互動邏輯
  member-id.ts            member_id 自動編號
  preview-test-student.ts 測試學員產生器
  supabase.ts             supabaseAdmin client

app/
  page.tsx                    報名首頁
  pay/page.tsx                繳費頁（選方案 + 匯款/刷卡）
  lodging/page.tsx            食宿登記頁
  quicktests/page.tsx         快篩上傳頁
  member/dashboard/page.tsx   學員儀表板
  member/practice/page.tsx    課前共修打卡
  member/interactive/page.tsx 互動意願登記
  member/course-checkin/page.tsx  課程逐場次打卡
  info/zoom-guide / schedule / payment  公開資訊頁
  admin/dashboard/page.tsx    報名管理
  admin/lodgings/page.tsx     食宿管理
  admin/timetable/page.tsx    課程時間表
  admin/schedules/page.tsx    自動匯出排程
  admin/practice/page.tsx     共修課表設定
  admin/practice-records/page.tsx  共修打卡紀錄
  admin/interactive/page.tsx  互動分組管理
  admin/interactive-tasks/page.tsx  互動作業
  admin/attendance-records/page.tsx  出席紀錄
  admin/quicktests/page.tsx   快篩狀況
  admin/documents/page.tsx    文件總覽
  admin/mail-queue/page.tsx   郵件佇列管理
  api/admin/mail-queue/*      郵件佇列 CRUD（list / status / retry / reconcile / batches）
  api/admin/cron/process-mail-queue  Vercel Cron 每分鐘送 30 封 QQ/163
  api/admin/cron/run-exports  Vercel Cron 每日排程匯出
  api/webhooks/resend/route.ts  Resend 退信補寄（阿里雲）

proxy.ts                    Next.js 16 middleware 替代（僅 /admin/*）
vercel.json                 cron 設定
supabase/schema.sql + practice.sql + interactive.sql + attendance_checkins.sql + site_config.sql
scripts/                    診斷/操作腳本（見 HANDOVER）
```

---

## 最近重大功能里程碑（倒序，非完整 git log）

- `mail-queue`：QQ/163 節流佇列（`email_queue` table）+ Vercel Cron 每分鐘 30 封 + 後台管理頁
- 阿里雲 SMTP 補寄：Resend webhook `bounced/failed/delivery_delayed` → 自動補寄
- `scripts/mail-queue.mjs`：統一查詢、對帳、重送工具（`--list/--reconcile/--retry`）
- 互動系統：報名意願 → 抽籤分組 → 通知 → 學員填作業
- 課程打卡：`course_sessions` + `course_session_checkins` 自動同步時間表
- 課前共修：`practice_schedule` + 打卡（限改 3 次規則）
- 學員 dashboard：`/member` portal，登入後看個人資訊 / 共修 / 互動 / 打卡
- Resend 取代 Gmail SMTP 成為主線（commit 50095c6）
- 先繳費再食宿（2026-04-19 流程倒轉）
- 三流程平行（/pay /lodging /quicktests 不互相阻擋）

主線在 `main`，開發在 `dev/dharmaworker`，流程：改 → commit/push dev → merge --ff-only → push main。

---

## 做事時要留意的

- **使用者是協作者（dharmaworker）**，不是技術背景很深的工程師。回答用中文、具體、可執行。
- **每個主要變更都會 commit + merge main**。不要累積多個未提交變更。
- **改 DB schema 時**：先給 SQL 請使用者跑，同步 `schema.sql` 文件，code 同時改。
- **寄信相關改動要注意 3 個收件人層**：`to` 學員 / `bcc` 學會 / `attachments` PDF。
- **外部服務變更**：Supabase bucket 設定、Vercel env、綠界 callback URL 都需要使用者在後台點選，程式改不了。
- **Vercel Hobby 限制**：cron 每天一次、function size 50MB、preview URL 預設有 auth 保護（綠界 callback 不能指到 preview）。
- **font 載入 via CDN** 避免把字體打包進 bundle（bundle size）。
- **logo 檔案**：`public/logo.webp`，使用者自己下載放上去的。
- **PDF 規格書不入 repo**：`.gitignore` 已 exclude `*.pdf`。

---

## 待辦 / 尚未實作

- RLS 實際啟用檢查（schema.sql 有 enable，Supabase 上要跑一下）
- 手機實機測試
- 刪除 `lodging_registrations.arrival_date` 等已 nullable 欄位的 NOT NULL 限制（使用者已跑 SQL 解除）

---

## 繼續的入口

使用者通常這樣開場：
- 「後台 X 功能要加 Y」→ 先看 `app/admin/**/page.tsx` + 對應 API
- 「寄信內容要改 Z」→ 先看 `lib/*-email.ts`
- 「新增欄位 W」→ SQL + schema.sql + API POST + 表單 + Admin view + Excel export
- 「某個頁面 bug」→ 先本機 `npm run dev` 重現

一個主要工作流對話結束後，通常我會 push + merge main。如果看到使用者說「就這樣」或「先這樣」，通常是放下話題不 push。**不要擅自 push 未確認的變更。**
