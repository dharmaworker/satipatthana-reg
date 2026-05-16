-- ============================================================
-- Migration: 互動場次動態化
-- 在 Supabase SQL Editor 執行此檔案
-- ============================================================

-- 集體互動場次表
CREATE TABLE IF NOT EXISTS interactive_sessions (
  id           text PRIMARY KEY,          -- 短文字 key，如 's1'，沿用既有資料
  teacher      text NOT NULL,             -- 顯示名稱，如 '阿姜宋猜尊者'
  date         text NOT NULL,             -- 顯示格式，如 '8/20（四）'
  time         text NOT NULL,             -- 如 '14:30 — 15:30'
  cap          integer NOT NULL DEFAULT 0,
  waitlist_cap integer NOT NULL DEFAULT 4,
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- 分組互動名額表（每位老師 × 每個日期 一行）
CREATE TABLE IF NOT EXISTS interactive_small_slots (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_key   text NOT NULL,            -- 內部 key，如 'prasan'，對應 assigned_group
  teacher_label text NOT NULL,            -- 顯示名稱，如 '阿姜巴山'
  date          date NOT NULL,            -- ISO 日期，如 '2026-08-21'
  cap           integer NOT NULL DEFAULT 0,
  waitlist_cap  integer NOT NULL DEFAULT 4,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- RLS（service_role key 自動 bypass，一般 anon 無法存取）
ALTER TABLE interactive_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive_small_slots ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────
-- 預填目前的硬寫資料（已有相同 id 則跳過）
-- ──────────────────────────────────────────
INSERT INTO interactive_sessions (id, teacher, date, time, cap, waitlist_cap, sort_order)
VALUES
  ('s1', '阿姜宋猜尊者', '8/20（四）', '14:30 — 15:30', 5, 4, 1),
  ('s2', '麥琪奧蘭努',   '8/21（五）', '14:00 — 15:30', 8, 4, 2),
  ('s3', '阿姜給尊者',   '8/24（一）', '14:00 — 15:30', 5, 4, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO interactive_small_slots (teacher_key, teacher_label, date, cap, waitlist_cap, sort_order)
VALUES
  ('prasan',   '阿姜巴山', '2026-08-21', 13, 4,  1),
  ('prasan',   '阿姜巴山', '2026-08-22', 13, 4,  2),
  ('prasan',   '阿姜巴山', '2026-08-23', 12, 4,  3),
  ('nat',      '阿姜納',   '2026-08-21', 13, 4,  4),
  ('nat',      '阿姜納',   '2026-08-22', 13, 4,  5),
  ('nat',      '阿姜納',   '2026-08-23', 12, 4,  6),
  ('nitiya',   '阿姜妮',   '2026-08-21', 13, 4,  7),
  ('nitiya',   '阿姜妮',   '2026-08-22', 13, 4,  8),
  ('nitiya',   '阿姜妮',   '2026-08-23', 12, 4,  9),
  ('napatpol', '阿姜松',   '2026-08-21', 13, 4, 10),
  ('napatpol', '阿姜松',   '2026-08-22', 13, 4, 11),
  ('napatpol', '阿姜松',   '2026-08-23', 12, 4, 12);
