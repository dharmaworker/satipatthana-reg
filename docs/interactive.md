# 互動報名與中簽系統說明

## 一、整體流程概覽

```
Admin 開放互動報名
       ↓
Admin 寄邀請信給錄取學員（批次寄報名互動通知）
       ↓
學員填寫互動報名表（集體場次 + 分組意願排序）→ 系統寄確認信
       ↓
互動報名截止（截止時間由 Admin 後台設定，存於 DB）
       ↓
Admin 執行自動抽簽（集體 / 分組可分開抽）
       ↓
Admin 逐一確認、補填場次／組別／日期
       ↓
Admin 批次寄結果通知信（中簽 / 候補 分別寄）
       ↓
中簽學員填寫互動作業
```

---

## 二、互動報名開關與截止時間

- 存在 `site_config` 表，key 為 `interactive_config`，value 為 `{ open, deadline_ms?, open_ms?, task_open_ms?, task_deadline_ms?, group_allow_optout?, small_required? }`（皆存於同一 JSON，加欄位不需 migration）
- **開放時**：學員 Dashboard 顯示「互動報名」task card，可進入填寫
- **關閉時**：task card 消失，學員無法送出，但已送出的資料不受影響
- **截止時間（`deadline_ms`）**：UTC epoch ms；未設定則 fallback 至 `INTERACTIVE_DEADLINE_MS`（`lib/interactive.ts` 硬寫常數）
- Admin 後台：`/admin/interactive` → 上方卡片「開放互動報名 / 關閉互動報名」按鈕；同一卡片可設定截止時間（台北時間 datetime-local 輸入）
- API：`GET/PUT /api/admin/interactive-config`

### 報名規則開關（2026 新增）

於 `/admin/interactive` →「場次 / 分組設定」面板最上方「報名規則」兩個勾選項，控制學員端行為，存於同一份 `interactive_config`：

| 設定 | 預設 | 勾選/取消的效果 |
|------|------|------|
| `group_allow_optout`（集體互動：允許不報名） | `true`（允許） | **取消** → 學員端隱藏「不報名集體互動」選項，且**必須至少選一個集體場次** |
| `small_required`（分組互動：設為必選） | `false`（可棄權） | **勾選** → 學員**必須至少為一位老師排序**，不能全部留空 |

- 學員端 UI 與說明文字會依此**連動**（Step 2/3 標題、提示、側欄說明、送出驗證）
- 會員端與伺服端 `POST /api/interactive` **雙重驗證**
- 預設值＝原行為（集體可不報名、分組可棄權），未勾選前一切照舊

---

## 三、學員端互動報名表

**網址**：`/member/interactive?id=<reg_id>&code=<random_code>`

**資格**：`registrations.status = 'approved'`（僅限錄取學員）

**截止**：由 `GET /api/interactive/config` 取得 `deadline_ms`，動態顯示台北時間日期與時段

### 三步驟表單

| Step | 內容 |
|------|------|
| 1 | 規則說明（閱讀後繼續） |
| 2 | 集體互動：勾選想參加的場次（可多選）。`group_allow_optout=true` 時可勾「不報名」；`false` 時隱藏該選項且必選 |
| 3 | 分組互動：將老師依意願排序。`small_required=false` 時不填＝不報名；`true` 時必選至少一位 |

### 集體互動場次（動態，由 DB 讀取）

場次存於 `interactive_sessions` 表，學員端只顯示 `is_active = true` 的場次。場次資料由 Admin 後台管理，不需改 code。

### 分組互動老師（動態，由 DB 讀取）

分組老師及每個日期的名額存於 `interactive_small_slots` 表，學員端只顯示 `is_active = true` 的場次。老師資料由 Admin 後台管理，不需改 code。

### 送出後

- DB 寫入 `interactive_registrations` 表（upsert，可重複送出）
- 系統寄**確認信**給學員（列出所選場次和意願排序），BCC 學會備存信箱
- 可於截止前重新送出，以最後一次為準
- 送出時已停用（`is_active = false`）的舊場次 ID 會靜默過濾（不擋送出）

---

## 四、資料庫表格說明

### `interactive_sessions`（集體場次）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | text PK | 短代碼（如 `s1`、`s2`），對應 `wanted_sessions` 的值；由系統自動產生，格式 `sN` |
| `teacher` | text | 顯示名稱（如 `阿姜宋猜尊者`） |
| `date` | text | 顯示格式（如 `2026/8/20（四）`），**含年份** |
| `time` | text | 時間區間（如 `14:30 — 15:30`） |
| `cap` | integer | 中簽名額 |
| `waitlist_cap` | integer | 候補名額 |
| `is_active` | boolean | false 則不顯示給學員、不納入抽簽 |
| `sort_order` | integer | 排列順序（Admin 後台用 ▲▼ 調整） |

> `date` 為自由文字，非 date 型別。學員端直接顯示此欄位，需含年份（`2026/8/20（四）`）。

### `interactive_small_slots`（分組名額，每位老師 × 每個日期一行）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | 自動產生 |
| `teacher_key` | text | 內部 key（如 `t1`、`t2`），對應 `wanted_ranking` / `assigned_group`；由系統自動產生，格式 `tN` |
| `teacher_label` | text | 顯示名稱（如 `阿姜巴山`） |
| `date` | date | ISO 日期（如 `2026-08-21`） |
| `cap` | integer | 中簽名額 |
| `waitlist_cap` | integer | 候補名額 |
| `is_active` | boolean | 控制整位老師是否啟用（同一老師的所有 slot 同步設定） |
| `sort_order` | integer | 排列順序（同一老師的所有 slot 共用，Admin 後台用 ▲▼ 調整） |

### `interactive_registrations`

| 欄位 | 說明 |
|------|------|
| `registration_id` | 對應 `registrations.id` |
| `wanted_sessions` | 學員選的集體場次（string[]，如 `["s1","s3"]`） |
| `wanted_ranking` | 學員的分組意願排序（string[]，如 `["t2","t1"]`） |
| `group_status` | 集體互動狀態（見下） |
| `small_status` | 分組互動狀態（見下） |
| `assigned_session` | Admin 指定的集體場次 ID |
| `assigned_group` | Admin 指定的分組老師 key |
| `assigned_date` | Admin 指定的分組互動日期 |
| `group_serial` | 集體互動序號（每場次各自計算） |
| `small_serial` | 分組互動序號（每位老師 × 每個日期各自計算） |
| `notification_sent_at` | 結果通知信寄出時間 |
| `submitted_at` / `updated_at` | 首次送出 / 最後更新時間 |

### 狀態值（group_status / small_status）

| 值 | 顯示 | 說明 |
|----|------|------|
| `pending` | 未定 | 尚未處理 |
| `won` | 中簽 | 已中簽，需補指定場次／組別 |
| `waitlist` | 候補 | 候補，有名額時另行通知 |
| `lost` | 沒中簽 | 未中簽 |
| `abstain` | 棄權 | 學員未填或 Admin 手動設定 |

---

## 五、Admin 後台互動報名管理

**網址**：`/admin/interactive`

**顯示對象**：`registrations.status = 'approved'` 且 `retreat_format ≠ 'online'`（僅實體學員）

### 篩選器

| 選項 | 說明 |
|------|------|
| 全部錄取者 | 所有符合條件的學員 |
| 已送出互動報名 | 有 `interactive_registrations` 記錄者 |
| 有未定（admin 還沒處理完） | 已送出但至少一邊仍為 pending |
| 集體中簽 | `group_status = 'won'` |
| 分組中簽 | `small_status = 'won'` |
| 中簽但未寄通知信 | 任一邊中簽且 `notification_sent_at` 為空 |

### 操作說明

1. **直接下拉修改狀態**：表格每行的「集體狀態」「分組狀態」欄是 `<select>`，直接切換即時存入 DB
2. **編輯指定**（金色按鈕，**永遠可點**，未送出者也可開）：開 Modal，分上下兩層 —
   - **上層＝報名志願（可代填/修改）**：集體場次用勾選、分組老師用數字排序。**未送出的學員也能由後台代填**（適用「原本希望送單但沒送」的人），存檔後自動建立互動報名列（狀態 pending），即可進抽簽。
   - **下層＝抽籤指定結果**：狀態 + 指定場次／組別／日期／序號。**指定場次／指定分組（選老師）只有在狀態設為「中簽/候補」時才顯示**（語意：指定＝宣告中簽），且下拉**連動**上層剛填的志願（只列勾選的場次／排序的老師）。
   - 儲存流程：先 `POST /api/admin/interactive/fill`（建立/更新志願）→ 再 `PATCH /api/admin/interactive`（存指定結果）。已送出者代填只更新志願、**保留既有抽籤狀態/指定**。
3. **容量統計**：可展開，顯示各集體場次與各老師已分配人數 vs 名額上限，超額會標紅
4. **批次寄報名互動通知**：勾選學員後點按，寄 `sendInteractiveInviteEmail`（邀請信）
5. **批次寄中簽通知信**：勾選學員後點按，寄 `sendInteractiveNotificationEmail`（僅中簽者）
6. **批次寄候補通知信**：勾選學員後點按，寄候補通知（跳過已中簽者，只寄有候補的學員）

三個批次寄信按鈕互斥（點任一個時其他兩個會 disable）。

---

## 六、場次設定面板（Admin 後台）

在 `/admin/interactive` 頁面的「場次 / 分組設定」區塊，Admin 可動態管理集體場次與分組老師。面板最上方為「報名規則」兩個勾選項（`group_allow_optout` / `small_required`，見「二、報名規則開關」）。

### 集體場次管理

- **新增場次**：填入老師名稱、日期（含年份格式 `2026/8/20（四）`）、時間、名額、候補名額；`id` 由系統自動產生（`sN` 格式，取現有最大 N + 1）
- **排序**：▲▼ 箭頭按鈕調整顯示順序（交換相鄰場次的 `sort_order`）
- **停用 / 啟用**：toggle `is_active`；停用後不顯示給學員，不納入抽簽
- **刪除**：僅限尚未有任何學員選取的場次

### 分組老師管理

- **老師以 card 呈現**，每張 card 包含老師名稱、啟用狀態、日期名額一覽
- **新增老師**：填入老師顯示名稱；`teacher_key` 由系統自動產生（`tN` 格式），不顯示給 Admin
- **新增日期**：在既有老師下新增一行（填入 ISO 日期、名額、候補名額）
- **排序**：老師層級的 ▲▼ 箭頭（交換同老師所有 slot 的 `sort_order`）
- **啟用 / 停用**：控制整位老師（同步更新該老師所有 slot 的 `is_active`）
- **刪除老師**：刪除該老師所有 slot

---

## 七、自動抽簽（🎲 自動抽簽按鈕）

### 集體互動抽簽邏輯（中簽 + 候補）

- **對象**：`group_status = 'pending'` 且 `wanted_sessions` 非空
- **範圍**：可選「全部場次同時抽」或「單一場次」
- **Phase 1（中簽）**：
  1. 計算各場次已分配名額（已中簽者）和目前剩餘
  2. 打亂（shuffle）符合條件的學員
  3. 每位學員依其 `wanted_sessions` 順序，找到第一個還有剩餘名額的場次 → 中簽；全部滿額 → 進 Phase 2
  4. 中簽者自動分配 `group_serial`，序號以場次為單位各自計算
- **Phase 2（候補）**：Phase 1 結束後，仍為 lost 的學員依意願順序嘗試候補
  1. 依 `wanted_sessions` 順序，找第一個還有候補名額的場次
  2. 候補名額：`interactive_sessions.waitlist_cap`（每場次獨立設定）
  3. 候補者分配 `assigned_session`、`group_serial`（候補序號，per 場次從 1 開始）
  4. 所有候補名額也滿 → `lost`

### 分組互動抽簽邏輯（多輪意願分配 + 候補）

- **對象**：`small_status = 'pending'` 且 `wanted_ranking` 非空
- **Phase 1（中簽）**：多輪意願分配
  1. 第一輪：所有學員依第 1 意願老師分組
     - 若報名人數 ≤ 剩餘名額 → 全部中簽
     - 若報名人數 > 剩餘名額 → 隨機抽，未中者進第二輪
  2. 第二輪：未中者依第 2 意願重複同樣邏輯，以此類推
  3. 意願用盡仍未中 → 進 Phase 2
  4. 中簽者**先選日期**：選該老師剩餘名額最多的日期（盡量平均分配）
  5. 中簽者自動分配 `small_serial`，序號以「老師 × 日期」為單位各自計算
- **Phase 2（候補）**：Phase 1 結束後，仍為 lost 的學員依意願順序嘗試候補

### 抽簽後流程

- 抽簽結果先在 Modal 中預覽（不立即寫入 DB）
- 確認後點「確定套用到資料庫」→ 呼叫 `POST /api/admin/interactive/batch-assign` 批次更新
- 套用後可透過「編輯指定」逐筆調整
- 抽簽僅對 active 場次 / active 老師執行

---

## 八、結果通知信

### 中簽通知信

**觸發**：Admin 後台勾選學員 → 「批次寄中簽通知信」

**API**：`POST /api/admin/interactive/notify`

**寄送條件**：`group_status = 'won'` 或 `small_status = 'won'` 其中一個成立才寄；兩邊都沒中則跳過

**信件內容**：
- 集體：中簽顯示指定場次 + 序號；候補顯示場次；沒中簽顯示結果
- 分組：中簽顯示指定老師 + 日期 + 序號；候補同上；沒中簽顯示結果
- **中簽者**：信內含互動作業填寫連結（`/member/interactive/task`）
- 寄出後更新 `notification_sent_at`，後台顯示寄出日期（綠色打勾）

### 候補通知信

**觸發**：Admin 後台勾選學員 → 「批次寄候補通知信」

**API**：`POST /api/admin/interactive/notify-waitlist`

**寄送條件**：跳過已中簽（`group_status = 'won'` 或 `small_status = 'won'`）；至少一邊為 `waitlist` 才寄；候補信告知列入候補，有名額釋出再通知

---

## 九、互動作業

**網址**：`/member/interactive/task?id=<reg_id>&code=<random_code>`

**資格**：`group_status = 'won'` 或 `small_status = 'won'` 其中一個成立

**必填欄位**：

| 欄位 | 說明 | 必填條件 |
|------|------|---------|
| `learning_duration` | 學習佛法年數 | 所有中簽者 |
| `formal_practice` | 正式禪修狀況 | 所有中簽者 |
| `daily_practice` | 日常禪修狀況 | 所有中簽者 |
| `group_prior_interaction` | 集體互動前問題背景 | 集體中簽者 |
| `group_question` | 集體互動問題（75 字限） | 集體中簽者 |
| `small_prior_interaction` | 分組互動前問題背景 | 分組中簽者 |
| `small_question` | 分組互動問題（75 字限） | 分組中簽者 |

---

## 十、郵件一覽

| 時機 | 收件人 | BCC | 函數 |
|------|--------|-----|------|
| Admin 寄邀請 | 個別學員 | 學會備存 | `sendInteractiveInviteEmail` |
| 學員送出互動報名 | 個別學員 | 學會備存 | `sendInteractiveSubmitConfirmEmail` |
| Admin 寄中簽通知 | 個別學員 | 學會備存 | `sendInteractiveNotificationEmail` |
| Admin 寄候補通知 | 個別學員 | 學會備存 | `sendInteractiveNotificationEmail`（waitlist 分支） |

- 邀請信與提交確認信：`sendMailWithRetry`（Resend × 2 → Gmail 備援）
- 結果通知信：`sendMail`（Resend × 1，無 retry）

---

## 十一、相關檔案索引

| 檔案 | 用途 |
|------|------|
| `lib/interactive.ts` | 共用常數（狀態常數、截止日 fallback） |
| `lib/interactive-config.ts` | 讀寫開放狀態、截止時間與報名規則（`open`、`deadline_ms`、`group_allow_optout`、`small_required`…） |
| `lib/interactive-db.ts` | DB 查詢函式（fetch sessions/slots，active or all） |
| `lib/interactive-invite-email.ts` | 邀請信 + 提交確認信 |
| `lib/interactive-notify-email.ts` | 結果通知信（中簽 / 候補） |
| `app/member/interactive/page.tsx` | 學員互動報名表單（3步驟） |
| `app/member/interactive/task/page.tsx` | 學員互動作業填寫 |
| `app/admin/interactive/page.tsx` | Admin 管理頁（含自動抽簽、場次設定面板） |
| `app/api/interactive/route.ts` | 學員讀取 / 送出互動報名 |
| `app/api/interactive/config/route.ts` | 公開端點：回傳 active 場次、老師、截止時間 |
| `app/api/interactive/task/route.ts` | 學員讀取 / 送出互動作業 |
| `app/api/admin/interactive/route.ts` | Admin 讀取清單 / 單筆更新（指定結果） |
| `app/api/admin/interactive/fill/route.ts` | Admin 代填學員志願（`wanted_sessions` / `wanted_ranking` upsert）（2026 新增） |
| `app/api/admin/interactive/batch-assign/route.ts` | 自動抽簽結果批次寫入 |
| `app/api/admin/interactive/notify/route.ts` | 批次寄中簽結果通知信 |
| `app/api/admin/interactive/notify-waitlist/route.ts` | 批次寄候補通知信 |
| `app/api/admin/interactive-config/route.ts` | 開放狀態與截止時間讀寫 |
| `app/api/admin/interactive-sessions/route.ts` | Admin CRUD 集體場次 |
| `app/api/admin/interactive-small-slots/route.ts` | Admin CRUD 分組名額 slot |
| `app/api/admin/send-interactive-invite/route.ts` | 批次寄邀請信 |
| `docs/migration-interactive-dynamic.sql` | DB migration：建立 `interactive_sessions` / `interactive_small_slots` 表並預填資料 |
