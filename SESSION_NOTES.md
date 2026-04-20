# Session Notes — satipatthana-reg

給新 Claude session 接手用的**精簡脈絡**。先看 [HANDOVER.md](HANDOVER.md) 了解全貌，這份只談做事時的慣例與最近決策。

---

## 一句話專案概述

第二屆台灣四念處禪修報名系統。學員：報名→錄取→繳費+食宿+快篩。後台：審核、管理、自動匯出 Excel。架構 Next.js 16 App Router + Supabase + Vercel + Gmail SMTP + ECPay。

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
  approval-email.ts       錄取信（to: 學員, bcc: 學會，帶 PDF 附件）
  approval-pdf.tsx        錄取信 PDF 組版（@react-pdf/renderer，中文用 Noto Sans TC CDN）
  archive-email.ts        食宿備存信（繳費事件觸發）
  quicktests-email.ts     快篩確認信 + 按鈕 HTML snippet
  mailer.ts               sendMail() 包裝 nodemailer
  export-excel.ts         產 6-sheet xlsx（exceljs）
  lodging-plan.ts         方案 <-> 日期/方式 推導
  supabase.ts             supabaseAdmin client

app/
  page.tsx                    報名首頁
  register/success/page.tsx   報名成功頁
  query/page.tsx              查詢狀態
  pay/page.tsx                繳費頁（選方案 + 匯款/刷卡）
  lodging/page.tsx            食宿登記頁
  quicktests/page.tsx         快篩上傳頁
  admin/_components/AdminHeader.tsx   後台共用 header（tab 切換）
  admin/login/page.tsx
  admin/dashboard/page.tsx    報名管理
  admin/lodgings/page.tsx     食宿管理
  admin/schedules/page.tsx    自動匯出排程
  api/register/route.ts
  api/upload-qr/route.ts
  api/upload-lodging/route.ts
  api/query/route.ts
  api/member/login+me
  api/payment/create + transfer + callback
  api/lodging/route.ts        GET + POST（upsert）
  api/quicktests/route.ts     GET + POST（upsert, 創 row if missing）
  api/admin/registrations     GET/PATCH/DELETE
  api/admin/lodgings          GET/PATCH
  api/admin/schedules         CRUD
  api/admin/cron/run-exports  Vercel Cron 觸發點
  api/admin/batch             批次錄取/拒絕/刪除
  api/admin/send-notifications 批次寄錄取信
  api/admin/export            匯出 CSV（另一條 endpoint，少用）

proxy.ts                    Next.js 16 middleware 替代（僅 /admin/*）
vercel.json                 cron 設定
supabase/schema.sql         DB schema 文件

scripts/                    診斷/操作腳本（見 HANDOVER）
```

---

## 最近 git 歷史（倒序）

```
e7367ae feat(email): 錄取信加入快篩上傳按鈕並更新流程說明
3e20826 refactor: 解除繳費/食宿/快篩三者的順序依賴，可平行進行
54688e3 feat(quicktests): 快篩檢測獨立頁面與 API，食宿確認信附連結
1e7a0d1 refactor: 取消食宿邀請信，改為錄取信直接附兩個按鈕
d9f6c00 feat(lodging): 學員食宿表支援重複更新並顯示「上次填寫」提示
85ba8ca feat(admin): 報名表後台新增「詳細」按鈕，預覽完整學員資料
64ce53f chore(export): 食宿 sheet 通訊欄合併為 2 欄
a6130cd feat(export): 食宿登記 sheet 加 LINE/WeChat ID 與 QR 連結
8e44719 feat(admin): 操作欄改用「編輯 + ⋯ 下拉」減少擁擠
7f008e1 feat(admin): /admin/dashboard 與 /admin/lodgings 共用 tab 樣式 header
```

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
