-- 互動報名 + 互動作業 (請至 Supabase SQL Editor 執行)

-- 互動報名：學員想要的（wanted_*）+ admin 實際分配的（status / assigned_*）
CREATE TABLE IF NOT EXISTS public.interactive_registrations (
  registration_id UUID PRIMARY KEY REFERENCES public.registrations(id) ON DELETE CASCADE,
  -- 學員想要（/member/interactive 填）
  wanted_sessions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  wanted_ranking  TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  -- admin 實際分配（/admin/interactive 填）
  group_status TEXT NOT NULL DEFAULT 'pending',  -- pending（未定） / won（中簽） / lost（沒中簽）
  small_status TEXT NOT NULL DEFAULT 'pending',
  assigned_session TEXT,                          -- 集體中簽：場次 id
  assigned_group   TEXT,                          -- 分組中簽：老師 id
  assigned_date    TEXT,                          -- 分組中簽：日期 (yyyy-mm-dd)
  notification_sent_at TIMESTAMPTZ,               -- 中簽通知信寄送時間
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.interactive_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.interactive_registrations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 互動作業：中簽後學員填寫
CREATE TABLE IF NOT EXISTS public.interactive_tasks (
  registration_id UUID PRIMARY KEY REFERENCES public.registrations(id) ON DELETE CASCADE,
  learning_duration TEXT,
  formal_practice   TEXT,
  daily_practice    TEXT,
  group_prior_interaction TEXT,
  group_question          TEXT,
  small_prior_interaction TEXT,
  small_question          TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.interactive_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.interactive_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
