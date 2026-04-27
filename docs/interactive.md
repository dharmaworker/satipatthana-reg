# 互動報名 / 互動作業

學員報名集體互動與分組互動 → admin 抽籤分配 → 批次寄通知信 → 中簽者填互動作業 → admin 檢視作業。

---

## 1. 資料模型

### `interactive_registrations`（互動報名）

每位學員一筆，PK = `registration_id`。

| 欄位 | 型別 | 寫入者 | 說明 |
|---|---|---|---|
| `registration_id` | UUID | 系統 | FK → `registrations.id`，ON DELETE CASCADE |
| `wanted_sessions` | TEXT[] | **學員** | 想要的集體場次（例：`['s1','s4']`），可空陣列 |
| `wanted_ranking` | TEXT[] | **學員** | 想要的分組老師排序，0 或 4 個 |
| `group_status` | TEXT | **admin** | `pending` / `won` / `lost` |
| `small_status` | TEXT | **admin** | 同上 |
| `assigned_session` | TEXT | **admin** | 集體中簽指定場次（s1～s6） |
| `assigned_group` | TEXT | **admin** | 分組中簽指定老師 |
| `assigned_date` | TEXT | **admin** | 分組中簽指定日期 |
| `group_serial` | INTEGER | **admin** | 集體互動序號（-1 ~ 15） |
| `small_serial` | INTEGER | **admin** | 分組互動序號（-1 ~ 15） |
| `notification_sent_at` | TIMESTAMPTZ | 系統 | 通知信寄送時間（成功才寫） |
| `submitted_at` | TIMESTAMPTZ | 系統 | 學員首次送出（DEFAULT NOW） |
| `updated_at` | TIMESTAMPTZ | 系統 | 任何欄位變更時更新 |

### `interactive_tasks`（互動作業）

每位中簽學員一筆，PK = `registration_id`。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `registration_id` | UUID | FK → `registrations.id` |
| `learning_duration` | TEXT | Q5 修習年資 |
| `formal_practice` | TEXT | Q6 固定形式練習 |
| `daily_practice` | TEXT | Q7 日常練習 |
| `group_prior_interaction` | TEXT | Q9 是否曾與該集體老師互動過（'yes'/'no'） |
| `group_question` | TEXT | Q10 集體互動問題（≤ 75 字） |
| `small_prior_interaction` | TEXT | Q13 同上（分組） |
| `small_question` | TEXT | Q15 分組互動問題（≤ 75 字） |
| `submitted_at`, `updated_at` | TIMESTAMPTZ | 同上 |

### 設定常數（hardcoded）

| 名稱 | 值 | 位置 |
|---|---|---|
| 集體場次 | s1～s6（每場 8 人） | `lib/interactive.ts` `SESSIONS` |
| 分組老師 | prasan / nat / nitiya / napatpol | `lib/interactive.ts` `TEACHERS` |
| 報名截止 | 2026/07/15 20:00 (台北) | `lib/interactive.ts` `INTERACTIVE_DEADLINE_MS` |
| 序號範圍 | -1 ~ 15 | `lib/interactive.ts` `SERIAL_OPTIONS` |

---

## 2. 學員流程

### 第一階段：互動報名（送出截止 7/15）

進入點：dashboard 的「互動報名」task card → `/member/interactive?id=&code=`

**3 步驟：**

1. **規則說明** — 集體 / 分組 / 名額規則（純文字）
2. **集體互動** — 6 場次複選（可全部不選 = 不報名集體）
3. **分組互動** — 4 老師拖拉排序（必須排滿 4 位，或全空 = 不報名分組）

送出後可在截止前重新送出修改。送出狀態 banner 顯示「已送出（可繼續修改）」。

### 第二階段：互動作業（中簽後填）

進入點：dashboard「互動作業」task card（**任一中簽才顯示**），或通知信內按鈕 → `/member/interactive/task?id=&code=`

**動態步驟（依中簽情況）：**

| 集體 | 分組 | 顯示步驟 |
|---|---|---|
| won | won | 3 步：基本資料 / 集體 / 分組 |
| won | lost or pending | 2 步：基本資料 / 集體 |
| lost or pending | won | 2 步：基本資料 / 分組 |
| 都不 won | — | 顯示「本頁僅限互動中簽者」擋下 |

**Step 1（基本資料）：**
報名序號、中文姓名、性別、身份從 `registrations` 表唯讀帶入；學員填 Q5 / Q6 / Q7。

**Step 2（集體）：**
場次唯讀顯示 admin 指定的（`assigned_session`），學員填 Q9 + Q10（75 字內）。

**Step 3（分組）：**
分組與日期唯讀顯示 admin 指定的（`assigned_group` + `assigned_date`），學員填 Q13 + Q15（75 字內）；email 唯讀帶入。

可重複送出修改。

---

## 3. Admin 流程

### `/admin/interactive` — 互動報名管理

列出**所有錄取學員**，已送出者在「想要的場次／排序」欄會顯示內容，未送出者「—」。

**主表格欄位：**
姓名 / 報名序號 / 想要的集體場次 / 集體狀態 / 指定場次 / **集體序號** / 想要的分組排序 / 分組狀態 / 指定分組 / **分組序號** / 通知信 / 操作

**操作建議流程：**

1. **先批次過篩** — 用搜尋 + filter（全部 / 已送出 / 集體中簽 / 分組中簽 / 未定）
2. **編輯指定**（modal） — 集體與分組分兩塊：
   - 「未定」與「中簽」狀態都能編場次／分組／日期／序號（**讓你可以先全部編好再標中簽**）
   - 「沒中簽」收起欄位，儲存時清空
   - 「中簽」狀態下對應欄位顯示 \* 必填星號（前端提示，後端不強制）
3. **改狀態為「中簽」** — 用 inline 下拉或 modal 設 `group_status='won'` / `small_status='won'`
4. **批次寄信** — 勾選對象 → 按「批次寄中簽通知信（N）」→ confirm → 發送
5. 寄成功的「通知信」欄會顯示綠 ✓ + 日期

### `/admin/interactive-tasks` — 互動作業檢視（唯讀）

列出所有送出作業的學員。
篩選：全部 / 集體中簽 / 分組中簽 / 兩個都中。
點「檢視」開 modal 看完整作業內容。

---

## 4. 狀態機

### `group_status` / `small_status`

```
pending（預設） ──┬──▶ won  ──┬──▶ pending（admin 反悔）
                 │           ├──▶ lost（清空 assigned_*）
                 │           └──▶ 其他 won（換場次）
                 └──▶ lost ──▶ pending / won（重新分配）
```

任何狀態都可以改任何狀態。`pending` 與 `won` 下都能編場次／序號。`lost` 會清空 assigned_* 與 serial。

### 通知信寄送條件

- 任何時候都能按按鈕（沒擋）
- 寄成功後 `notification_sent_at` 更新
- 同一人重複寄會覆蓋寄送時間（用於補寄或更正）

---

## 5. Email 觸發

| 事件 | 觸發者 | 收件人 | 模板 |
|---|---|---|---|
| 互動結果通知 | admin 按「批次寄」 | 學員 + bcc 學會 | `lib/interactive-notify-email.ts` |

通知信內容：
- 集體 / 分組各自的中簽結果（含金色 pill「序號 N」）
- 中簽者：含「前往填寫互動作業」按鈕（連到 `/member/interactive/task`）
- 都沒中：金色 alert 提示

---

## 6. 檔案地圖

```
satipatthana-reg/
├── supabase/
│   └── interactive.sql            -- 兩張表 + RLS policy
├── lib/
│   ├── interactive.ts             -- 常數（SESSIONS, TEACHERS, deadline, SERIAL_OPTIONS）+ types
│   └── interactive-notify-email.ts-- 中簽通知信模板
├── app/
│   ├── api/
│   │   ├── interactive/
│   │   │   ├── route.ts           -- 學員 GET/POST（auth + 截止檢查）
│   │   │   └── task/route.ts      -- 學員 GET/POST 作業（含中簽 gate）
│   │   └── admin/
│   │       ├── interactive/
│   │       │   ├── route.ts       -- admin GET/PATCH
│   │       │   └── notify/route.ts-- admin POST 批次寄信
│   │       └── interactive-tasks/
│   │           └── route.ts       -- admin GET 作業列表
│   ├── member/
│   │   └── interactive/
│   │       ├── page.tsx           -- 互動報名頁（3 step）
│   │       └── task/page.tsx      -- 互動作業頁（動態 step）
│   └── admin/
│       ├── interactive/page.tsx   -- 互動報名管理（含 EditModal）
│       └── interactive-tasks/page.tsx -- 互動作業檢視
├── app/api/member/me/route.ts     -- 擴充：多回 interactive_*/task_submitted
└── app/member/dashboard/page.tsx  -- task-grid 加 2 張卡（互動報名 / 作業）
```

---

## 7. 已知限制 / 可改善點

非致命，但留紀錄：

| 項目 | 說明 | 影響 |
|---|---|---|
| SQL 重跑可能 fail | `CREATE POLICY` 沒 `IF NOT EXISTS`，跑第二次會錯 | 第一次跑沒事；補解法：跑前先 `DROP POLICY IF EXISTS` |
| 後端沒強制「中簽要有指定」 | admin 可存 `status='won'` + `assigned_session=null` | Email 會顯示「（場次待補）」，不爆但不一致 |
| 沒場次容量警示 | s1 8 人額滿可被指定給 9 個人 | admin 自己抓 |
| 「未定」filter 太窄 | 要兩邊都 pending 才算 | 想看「至少一邊還沒處理」要改 OR 邏輯 |
| `/api/admin/interactive` PATCH 可建空 row | upsert 對沒提交者也會建 row | 前端把按鈕 gate 在 `it` 存在，實務不會發生 |

---

## 8. 部署檢查清單

第一次部署：
1. ✅ 跑 [supabase/interactive.sql](../supabase/interactive.sql)
2. ✅ 確認 `NEXT_PUBLIC_BASE_URL` env var 存在（中簽信內按鈕會用）
3. ✅ 跑 `next build` 沒錯

之後升級（已存在 DB，加 serial 欄位）：
1. 在 Supabase SQL Editor 跑：
   ```sql
   ALTER TABLE public.interactive_registrations ADD COLUMN IF NOT EXISTS group_serial INTEGER;
   ALTER TABLE public.interactive_registrations ADD COLUMN IF NOT EXISTS small_serial INTEGER;
   ```
