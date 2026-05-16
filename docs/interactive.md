# 互動報名與中簽系統說明

## 一、整體流程概覽

```
Admin 開放互動報名
       ↓
Admin 寄邀請信給錄取學員
       ↓
學員填寫互動報名表（集體場次 + 分組意願排序）→ 系統寄確認信
       ↓
互動報名截止（2026/07/15 20:00 台北時間）
       ↓
Admin 執行自動抽簽（集體 / 分組可分開抽）
       ↓
Admin 逐一確認、補填場次／組別／日期
       ↓
Admin 批次寄結果通知信
       ↓
中簽學員填寫互動作業
```

---

## 二、互動報名開關

- 存在 `site_config` 表，key 為 `interactive_config`，value 為 `{ open: boolean }`
- **開放時**：學員 Dashboard 顯示「互動報名」task card，可進入填寫
- **關閉時**：task card 消失，學員無法送出，但已送出的資料不受影響
- Admin 後台：`/admin/interactive` → 上方卡片「開放互動報名 / 關閉互動報名」按鈕
- API：`GET/PUT /api/admin/interactive-config`

---

## 三、學員端互動報名表

**網址**：`/member/interactive?id=<reg_id>&code=<random_code>`

**資格**：`registrations.status = 'approved'`（僅限錄取學員）

**截止**：2026/07/15 20:00 台北時間（`Date.UTC(2026, 6, 15, 12, 0, 0)`）

### 三步驟表單

| Step | 內容 |
|------|------|
| 1 | 規則說明（閱讀後繼續） |
| 2 | 集體互動：勾選想參加的場次（可多選），或勾選「不報名」 |
| 3 | 分組互動：將老師依意願排序 1～4（不填代表不報名） |

### 集體互動場次（含名額）

| ID | 日期 | 時間 | 老師 | 名額 |
|----|------|------|------|------|
| s1 | 8/20（四） | 14:30—15:30 | 阿姜宋猜尊者 | 5 |
| s2 | 8/21（五） | 14:00—15:30 | 麥琪奧蘭努 | 8 |
| s3 | 8/24（一） | 14:00—15:30 | 阿姜給尊者 | 5 |

**集體總名額**：18

### 分組互動老師（含名額）

| ID | 姓名 | 英文名 | 名額（總） |
|----|------|--------|-----------|
| prasan | 阿姜巴山 | Ajahn Prasan | 38 |
| nat | 阿姜納 | Ajahn Nat | 38 |
| nitiya | 阿姜妮 | Ajahn Nitiya | 38 |
| napatpol | 阿姜松 | Ajahn Napatpol | 38 |

**分組互動日期分配**（每位老師）

| 日期 | 名額 |
|------|------|
| 2026-08-21（週五） | 13 |
| 2026-08-22（週六） | 13 |
| 2026-08-23（週日） | 12 |

**分組總名額**：152（4 位老師 × 38）

**候補名額**：每位老師 × 每個日期各 4 位，共 48 位候補（4 老師 × 3 日期 × 4）

### 送出後

- DB 寫入 `interactive_registrations` 表（upsert，可重複送出）
- 系統寄**確認信**給學員（列出所選場次和意願排序），BCC 學會備存信箱
- 可於截止前重新送出，以最後一次為準

---

## 四、資料庫欄位說明

### `interactive_registrations`

| 欄位 | 說明 |
|------|------|
| `registration_id` | 對應 `registrations.id` |
| `wanted_sessions` | 學員選的集體場次（string[]，e.g. `["s1","s3"]`） |
| `wanted_ranking` | 學員的分組意願排序（string[]，e.g. `["nat","prasan"]`） |
| `group_status` | 集體互動狀態（見下） |
| `small_status` | 分組互動狀態（見下） |
| `assigned_session` | Admin 指定的集體場次 ID |
| `assigned_group` | Admin 指定的分組老師 ID |
| `assigned_date` | Admin 指定的分組互動日期 |
| `group_serial` | 集體互動序號（-1 ~ 70，每個場次各自計算） |
| `small_serial` | 分組互動序號（-1 ~ 70，每位老師 × 每個日期各自計算） |
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

> **棄權的判斷邏輯**：Admin 後台顯示時，若 `wanted_sessions` 為空陣列，集體欄位直接顯示「—」（不允許編輯狀態）；`wanted_ranking` 同理。這是 UI 判斷，DB 的 `group_status`/`small_status` 可仍為 `pending`。

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
2. **編輯指定**（金色按鈕）：開 Modal，可設定狀態 + 指定場次／組別／日期／序號
3. **容量統計**：可展開，顯示各集體場次與各老師已分配人數 vs 名額上限，超額會標紅
4. **批次寄中簽通知信**：勾選學員後點按，寄 `sendInteractiveNotificationEmail`

---

## 六、自動抽簽（🎲 自動抽簽按鈕）

### 集體互動抽簽邏輯

- **對象**：`group_status = 'pending'` 且 `wanted_sessions` 非空
- **範圍**：可選「全部場次同時抽」或「單一場次」
- **步驟**：
  1. 計算各場次已分配名額（已中簽者）和目前剩餘
  2. 打亂（shuffle）符合條件的學員
  3. 每位學員依其 `wanted_sessions` 順序，找到第一個還有剩餘名額的場次 → 中簽；全部滿額 → 沒中簽
  4. 中簽者自動分配 `group_serial`，**序號以場次為單位各自計算**（從該場次現有最大序號 + 1 遞增）

**序號規則（集體）**：每個場次獨立一組序號。例如 s1 場次的學員序號為 1～5，s2 場次的學員序號為 1～8，互不影響。

### 分組互動抽簽邏輯（多輪意願分配 + 候補）

- **對象**：`small_status = 'pending'` 且 `wanted_ranking` 非空
- **Phase 1（中簽）**：
  1. 第一輪：所有學員依第 1 意願老師分組
     - 若報名人數 ≤ 剩餘名額 → 全部中簽
     - 若報名人數 > 剩餘名額 → 隨機抽，未中者進第二輪
  2. 第二輪：未中者依第 2 意願重複同樣邏輯，以此類推
  3. 意願用盡仍未中 → 進 Phase 2
  4. 中簽者**先選日期**：選該老師剩餘名額最多的日期（盡量平均分配）
  5. 中簽者自動分配 `small_serial`，序號以「老師 × 日期」為單位各自計算
- **Phase 2（候補）**：Phase 1 結束後，仍為 lost 的學員依意願順序嘗試候補
  1. 依 `wanted_ranking` 順序，找第一個還有候補名額的老師 + 日期
  2. 候補名額：每位老師 × 每個日期 **4 位**
  3. 候補者同樣分配 `assigned_group`、`assigned_date`、`small_serial`（候補序號，per 老師 × per 日期，從 1 開始，與中簽序號獨立）
  4. 所有候補名額也滿 → `lost`

**序號規則（分組）**：每位老師的每個日期，中簽與候補各有一組獨立序號。例如：

| 老師 | 日期 | 中簽名額 | 中簽序號 | 候補名額 | 候補序號 |
|------|------|---------|---------|---------|---------|
| 阿姜巴山 | 8/21 | 13 | 1～13 | 4 | 1～4 |
| 阿姜巴山 | 8/22 | 13 | 1～13 | 4 | 1～4 |
| 阿姜巴山 | 8/23 | 12 | 1～12 | 4 | 1～4 |
| 阿姜納 | 8/21 | 13 | 1～13 | 4 | 1～4 |
| …（以此類推） | | | | | |

每位老師三個日期合計 38 位中簽、12 位候補，序號各日期獨立計算。

### 抽簽後流程

- 抽簽結果先在 Modal 中預覽（不立即寫入 DB）
- 確認後點「確定套用到資料庫」→ 呼叫 `POST /api/admin/interactive/batch-assign` 批次更新
- 套用後可透過「編輯指定」逐筆調整

---

## 七、結果通知信

**觸發**：Admin 後台勾選學員 → 「批次寄中簽通知信」

**API**：`POST /api/admin/interactive/notify`

**寄送條件**：`group_status = 'won'` 或 `small_status = 'won'` 其中一個成立才寄；兩邊都沒中（包含候補）則跳過

**信件內容**：
- 集體：中簽顯示指定場次 + 序號；候補顯示場次；沒中簽顯示結果
- 分組：中簽顯示指定老師 + 日期 + 序號；候補同上；沒中簽顯示結果
- **中簽者**：信內含互動作業填寫連結（`/member/interactive/task`）
- **純候補者**：告知列入候補，有名額釋出再通知
- 寄出後更新 `notification_sent_at`，後台顯示寄出日期（綠色打勾）

**注意**：候補的人不會收到結果通知信（由 notify API 的 `skippedNoWin` 跳過）

---

## 八、互動作業

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

## 九、郵件一覽

| 時機 | 收件人 | BCC | 函數 |
|------|--------|-----|------|
| Admin 寄邀請 | 個別學員 | 學會備存 | `sendInteractiveInviteEmail` |
| 學員送出互動報名 | 個別學員 | 學會備存 | `sendInteractiveSubmitConfirmEmail` |
| Admin 寄中簽通知 | 個別學員 | 學會備存 | `sendInteractiveNotificationEmail` |

- 邀請信與提交確認信：`sendMailWithRetry`（Resend × 2 → Gmail 備援）
- 結果通知信：`sendMail`（Resend × 1，無 retry）

---

## 十、相關檔案索引

| 檔案 | 用途 |
|------|------|
| `lib/interactive.ts` | 共用常數（老師、場次、狀態、截止日） |
| `lib/interactive-config.ts` | 讀寫開放狀態 |
| `lib/interactive-invite-email.ts` | 邀請信 + 提交確認信 |
| `lib/interactive-notify-email.ts` | 結果通知信 |
| `app/member/interactive/page.tsx` | 學員互動報名表單（3步驟） |
| `app/member/interactive/task/page.tsx` | 學員互動作業填寫 |
| `app/admin/interactive/page.tsx` | Admin 管理頁（含自動抽簽） |
| `app/api/interactive/route.ts` | 學員讀取 / 送出互動報名 |
| `app/api/interactive/task/route.ts` | 學員讀取 / 送出互動作業 |
| `app/api/admin/interactive/route.ts` | Admin 讀取清單 / 單筆更新 |
| `app/api/admin/interactive/batch-assign/route.ts` | 自動抽簽結果批次寫入 |
| `app/api/admin/interactive/notify/route.ts` | 批次寄結果通知信 |
| `app/api/admin/interactive-config/route.ts` | 開放狀態開關 |
| `app/api/admin/send-interactive-invite/route.ts` | 批次寄邀請信 |
