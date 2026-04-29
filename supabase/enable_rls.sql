-- 補開所有 table 的 RLS（冪等：已開的不受影響）
-- 在 Supabase SQL Editor 執行一次即可

ALTER TABLE public.registrations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lodging_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_exports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactive_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactive_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config            ENABLE ROW LEVEL SECURITY;

-- 確認結果（執行後應全部 rowsecurity = true）
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
