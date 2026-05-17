# 互動報名系統 — 審查報告

> 審查範圍：動態化重構 + 場次管理 UI + 批次寄信功能的全部相關檔案  
> 審查日期：2026-05-17  
> 分支：`dev/dharmaworker`

---

## 一、已修正的問題

### 1. DELETE 路由讀取方式錯誤（已修）

**檔案：** `app/api/admin/interactive-sessions/route.ts`、`app/api/admin/interactive-small-slots/route.ts`

**問題：** DELETE 路由從 URL searchParams 讀 `id`，但 admin 頁面的 `SessionManagePanel` 用 JSON body 送 `{ id }`，兩邊對不上，刪除永遠失敗。

**修正：** DELETE handler 改為 `request.json()` 讀取 body。

---

### 2. 抽簽包含 inactive 場次（已修）

**檔案：** `app/admin/interactive/page.tsx` → `AutoDrawModal`

**問題：** Admin 頁面 state 中的 `sessions`/`slots` 包含全部記錄（含 `is_active = false`），直接傳給抽簽函式會把停用場次的容量也算進去。

**修正：** `runDraw` 前先 filter `s.is_active === true`，再推導 active teachers。

---

### 3. 通知信用 `fetchAllSessions`（已修）

**檔案：** `lib/interactive-notify-email.ts`

**問題：** `sendInteractiveNotificationEmail` 和 `sendInteractiveTaskConfirmEmail` 都呼叫 `fetchActiveSessions`/`fetchActiveSmallSlots`。若寄信前某個場次被停用，信中該場次 label 會顯示 `（場次待補）`。

**修正：** 改用 `fetchAllSessions`/`fetchAllSmallSlots`（取全部，無論是否啟用），確保歷史指定場次一定能查到名稱。

> 學員送出確認信（`sendInteractiveSubmitConfirmEmail`）維持用 active-only，因為送出當下場次必然是 active 的。

---

### 4. `wanted_ranking` server 端未驗重複（已修）

**檔案：** `app/api/interactive/route.ts`

**問題：** 學員端 UI 邏輯防止重複排序，但 server 未驗，惡意或異常請求可送出 `['t1', 't1']`。

**修正：** 加入 `new Set(wanted_ranking).size !== wanted_ranking.length` 檢查，重複時回 400。

---

### 5. 停用 session 阻擋學員重新送出（已修）

**檔案：** `app/api/interactive/route.ts`

**問題：** 學員舊資料若含有已刪除/停用的 session ID，server 原本會整筆拒絕送出。學員端的 checkbox 也不會顯示已停用場次，所以學員無法主動取消選取，導致完全無法修改互動報名。

**修正：** 改為靜默過濾（`filter` 而非 `reject`），送出時自動去掉無效 session ID，保留有效部分寫入。

---

### 6. 截止時間硬寫（已修）

**問題：** `INTERACTIVE_DEADLINE_MS` 硬寫在程式碼中，每屆需改 code。

**修正：**
- `lib/interactive-config.ts` 新增 `deadline_ms?: number` 欄位及 `resolveDeadlineMs(config)` helper（fallback 至 `INTERACTIVE_DEADLINE_MS`）
- `site_config` 的 `interactive_config` key 可存 `{ open: bool, deadline_ms: number }`
- `app/api/admin/interactive-config` GET/PUT 支援讀寫 `deadline_ms`
- Admin 後台「開放狀態」列加入台北時間 `datetime-local` 輸入，送出轉 UTC epoch ms 存入 DB
- `app/api/interactive/config`（公開端點）回傳 `deadline_ms`、active sessions、active slots
- `app/api/interactive` GET 回傳 `resolveDeadlineMs(config)` 而非硬寫常數；POST 驗截止也改用 `resolveDeadlineMs`
- 學員側欄截止日期從 `deadline` state 動態推算台北時間 MM.DD + 時段 + 時間
- 成功頁從 URL `?dl=<epoch>` 取得截止日期顯示，fallback 顯示硬寫常數

---

### 7. 「指定場次」下拉排序錯誤（已修）

**檔案：** `app/admin/interactive/page.tsx` → `EditModal`

**問題：** 上一版不小心把 EditModal 中「指定場次」下拉改成按 sessions 的 `sort_order` 排序，破壞了學員填報時的志願順序語意。

**修正：** 恢復為依學員 `wanted_sessions` 陣列順序排列（學員第一志願排第一），與學員填報時的意願一致。

---

## 二、本次新增功能

### 集體場次與分組老師動態化

**原本：** 場次與老師資料硬寫在 `lib/interactive.ts`，每屆需改 code。

**現在：**
- 集體場次存於 `interactive_sessions` 表
- 分組名額存於 `interactive_small_slots` 表（每位老師 × 每個日期一行）
- DB query 函式集中至 `lib/interactive-db.ts`
- Admin 後台「場次設定面板」可直接 CRUD，不需改 code

### Admin 場次管理 UI

**集體場次區塊：**
- `id`（sN）由系統自動產生，取現有最大 N + 1，不顯示給 Admin
- ▲▼ 箭頭調整排列順序（交換相鄰場次的 `sort_order`）
- 停用 / 啟用 toggle、刪除按鈕

**分組老師區塊：**
- `teacher_key`（tN）由系統自動產生，格式同上，不顯示給 Admin
- 老師以 card 呈現，每張 card 包含老師名稱、啟用狀態、所有日期名額
- ▲▼ 箭頭調整老師順序（更新同老師所有 slot 的 `sort_order`）
- 新增老師：填顯示名稱即可；新增日期：選日期 + 填名額
- 停用整位老師（同步更新該老師所有 slot 的 `is_active`）

### 三個批次寄信按鈕

| 按鈕 | API | 寄送對象 |
|------|-----|---------|
| 批次寄報名互動通知 | `POST /api/admin/send-interactive-invite` | 邀請信（無條件，Admin 勾選者） |
| 批次寄中簽通知信 | `POST /api/admin/interactive/notify` | `group_status='won'` 或 `small_status='won'` |
| 批次寄候補通知信 | `POST /api/admin/interactive/notify-waitlist` | 至少一邊 `waitlist`，且沒有任一邊 `won` |

三個按鈕互斥（點任一個時其他兩個 disable）。

---

## 三、設計確認（無問題，記錄供參考）

### 驗證邊界

| 層級 | 集體場次驗證 | 分組老師驗證 |
|------|-------------|-------------|
| 學員端 (`/api/interactive` POST) | active session 靜默過濾 | active teacher 驗證；重複檢查 |
| Admin 手動指定 (`/api/admin/interactive` PATCH) | 查 all sessions（含停用） | 查 all teachers（含停用） |
| 抽簽函式 | 只跑 active sessions | 只跑 active slots/teachers |

Admin 手動指定允許指定「已停用但歷史上曾存在」的場次，因為 admin 可能需要修正停用前已產生的資料。

### 通知信寄送邏輯

- **中簽通知信**：`group_status === 'won' || small_status === 'won'`（候補不寄）
- **候補通知信**：至少一邊 `waitlist` 且沒有任一邊 `won`
- **重寄防護**：無自動防護，由 admin 透過「中簽但未寄通知信」篩選器自行控制
- **`notification_sent_at`**：每次成功寄出都更新，admin 可看到最後寄出時間（候補通知信不更新此欄位，僅中簽通知信更新）

### 抽簽演算法

**集體互動（`runGroupDraw`）：**
1. Phase 1 — 隨機洗牌，依意願順序找第一個有名額的場次，分配序號
2. Phase 2 — 落選者依意願順序找第一個有候補名額的場次，分配候補序號
3. `alreadyWon`/`alreadyWaitlist` 在執行前先從 `rows` 掃描現有 DB 資料，確保增量執行（re-run 不重複計算既有中簽者）

**分組互動（`runSmallGroupDraw`）：**
1. Phase 1 — 多輪意願抽簽；每輪各老師的競爭者隨機抽，得名額者再分配剩餘名額最多的日期
2. Phase 2 — 落選者依意願找候補名額最多的老師＋日期
3. 同樣先從 `rows` 掃描現有資料再執行，支援增量

### 欄位格式慣例（Admin 需遵守）

`interactive_sessions` 的 `date` 欄位是 **自由文字**（非 date 型別），學員端直接顯示 `{date}`，**年份需由 admin 自行填入欄位**。

- ✓ 正確格式：`2026/8/20（四）` → 顯示 `2026/8/20（四）`
- ✗ 不含年份：`8/20（四）` → 顯示 `8/20（四）`（學員不知道是哪一年）

新增場次時請使用 `YYYY/M/D（星期）` 格式，如 `2026/8/20（四）`。下一屆直接改年份即可，code 無需修改。

`interactive_small_slots` 的 `date` 欄位是 **PostgreSQL date 型別**（ISO `YYYY-MM-DD`），不受此限制。

---

## 四、可接受的已知限制（無需修正）

| 項目 | 說明 | 影響範圍 |
|------|------|---------|
| Admin 指定日期不驗 slot | PATCH `/api/admin/interactive` 可設定任意 `assigned_date`，不驗是否存在於該老師的 slots | Admin-only，操作錯誤會反映在容量統計 |
| `batch-assign` 不驗欄位值 | 直接傳 `...fields` 給 Supabase update，無型別/範圍檢查 | Admin-only；Supabase 有 schema 保護 |
| `batch-assign` 即使有失敗仍回 200 | 回傳 `{ applied, failed }`，failed > 0 不會顯示 alert | Admin 可從刷新後的表格確認結果 |
| 候補通知信不更新 `notification_sent_at` | 僅中簽通知信更新此欄位；候補寄信後後台不留記錄 | Admin 需自行追蹤候補寄信狀況 |

---

## 五、完整資料流總覽

```
學員端                     Server API                     DB
─────────────────────────────────────────────────────────────────
/member/interactive
  ├─ GET /api/interactive/config ──────────────────→ interactive_sessions (active)
  │                                                   interactive_small_slots (active)
  │                                                   site_config (deadline_ms)
  ├─ GET /api/interactive ──────────────────────────→ registrations
  │                                                   interactive_registrations
  └─ POST /api/interactive ─────────────────────────→ interactive_registrations (upsert)
       └─ 寄確認信 (active sessions/slots label)

/member/interactive/task
  ├─ GET /api/interactive/config ──────────────────→ interactive_sessions (active)
  ├─ GET /api/interactive/task ─────────────────────→ interactive_registrations (won check)
  │                                                   interactive_tasks
  └─ POST /api/interactive/task ────────────────────→ interactive_tasks (upsert)
       └─ 寄作業確認信 (all sessions/slots label)

/admin/interactive
  ├─ GET /api/admin/interactive ────────────────────→ registrations (approved)
  │                                                   interactive_registrations
  ├─ GET /api/admin/interactive-sessions ──────────→ interactive_sessions (all)
  ├─ GET /api/admin/interactive-small-slots ───────→ interactive_small_slots (all)
  ├─ PATCH /api/admin/interactive ─────────────────→ interactive_registrations
  ├─ POST /api/admin/interactive/batch-assign ─────→ interactive_registrations (bulk)
  ├─ POST /api/admin/send-interactive-invite ───────→ 寄邀請信
  ├─ POST /api/admin/interactive/notify ───────────→ 寄中簽通知信
  │       └─ UPDATE notification_sent_at
  └─ POST /api/admin/interactive/notify-waitlist ──→ 寄候補通知信

/admin/interactive（場次設定面板）
  ├─ POST/PATCH/DELETE /api/admin/interactive-sessions
  └─ POST/PATCH/DELETE /api/admin/interactive-small-slots
```
