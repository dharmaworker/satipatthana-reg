-- 通用 key/value 設定表（JSONB），目前用來放「課程時間表」
-- 跑一次：在 Supabase SQL Editor 貼上執行
CREATE TABLE IF NOT EXISTS public.site_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 由 service role 寫入；anon 不需 RLS（API 都走 supabaseAdmin）
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.site_config FOR ALL TO service_role USING (true) WITH CHECK (true);
