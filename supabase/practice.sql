-- 課前共修 (Pre-Retreat Practice)
-- 在 Supabase Dashboard → SQL Editor 貼上執行即可

-- ========== practice_config ==========
CREATE TABLE IF NOT EXISTS public.practice_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- 單列設計
  enabled BOOLEAN NOT NULL DEFAULT true,
  period_label TEXT NOT NULL DEFAULT '8/4 至 8/16',
  zoom_meeting_id TEXT NOT NULL DEFAULT '833 7654 321',
  zoom_password TEXT NOT NULL DEFAULT '123456',
  zoom_url TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.practice_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.practice_config;
CREATE POLICY "service_role_all" ON public.practice_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 預填設定
INSERT INTO public.practice_config (id, enabled, period_label, zoom_meeting_id, zoom_password)
VALUES (1, true, '8/4 至 8/16', '833 7654 321', '123456')
ON CONFLICT (id) DO NOTHING;

-- ========== practice_schedule ==========
CREATE TABLE IF NOT EXISTS public.practice_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INTEGER NOT NULL,
  session_date DATE NOT NULL,
  time_label TEXT NOT NULL,           -- e.g. "晚上 8 時" / "上午 10 時"
  title TEXT NOT NULL,                -- e.g. "《一心》"
  subtitle TEXT,                      -- e.g. "（中文字幕）"
  is_live BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  video_url TEXT,                     -- 影片連結（選填）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 既有 DB 升級
ALTER TABLE public.practice_schedule ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.practice_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.practice_schedule;
CREATE POLICY "service_role_all" ON public.practice_schedule FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 預填課表（第一週：One Mind2.html 普通話）
INSERT INTO public.practice_schedule (sort_order, session_date, time_label, title, subtitle, is_live) VALUES
  (1, '2026-08-04', '晚上 8 時', '《一心》', '（中文字幕）', false),
  (2, '2026-08-06', '晚上 8 時', '《不迷失，不緊盯，方能跨越煩惱之海》', '（隆波帕默尊者開示 2023年11月26日）', false),
  (3, '2026-08-08', '上午 10 時', '現場直播', null, true),
  (4, '2026-08-09', '上午 10 時', '《佛教三學的完整路線》', '（隆波帕默尊者開示 2024年6月16日）', false),
-- 第二週：One Mind.html 普通話
  (5, '2026-08-11', '晚上 8 時', '《隆波帕默尊者開示》', '（2024年12月8日）', false),
  (6, '2026-08-13', '晚上 8 時', '《在日常生活之中開發覺性》', '（中文字幕）', false),
  (7, '2026-08-15', '上午 10 時', '現場直播', null, true),
  (8, '2026-08-16', '上午 10 時', '現場直播', null, true);

-- ========== practice_checkins ==========
CREATE TABLE IF NOT EXISTS public.practice_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  schedule_item_id UUID NOT NULL REFERENCES public.practice_schedule(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (registration_id, schedule_item_id)
);
CREATE INDEX IF NOT EXISTS idx_practice_checkins_reg ON public.practice_checkins(registration_id);
ALTER TABLE public.practice_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.practice_checkins;
CREATE POLICY "service_role_all" ON public.practice_checkins FOR ALL TO service_role USING (true) WITH CHECK (true);
