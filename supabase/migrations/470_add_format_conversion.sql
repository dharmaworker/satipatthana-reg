-- 課程形式轉換（實體 ↔ 線上）：稽核記錄 + 報名序號/學號唯一約束（防併發撞號）
-- 需在「正式版」與「測試版」兩組 Supabase 皆執行（見 memory: supabase-two-databases）

-- 1) 轉換稽核記錄
CREATE TABLE IF NOT EXISTS format_conversion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  from_format text,
  to_format text,
  old_member_id text,
  new_member_id text,
  old_student_id text,
  new_student_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fcl_registration ON format_conversion_logs(registration_id);

-- 2) 報名序號唯一（排除 null）— 防止併發轉換/報名撞號
CREATE UNIQUE INDEX IF NOT EXISTS uniq_registrations_member_id
  ON registrations (member_id) WHERE member_id IS NOT NULL;

-- 3) 學號唯一（排除 null）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_registrations_student_id
  ON registrations (student_id) WHERE student_id IS NOT NULL;
