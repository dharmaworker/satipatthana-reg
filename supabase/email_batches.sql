CREATE TABLE IF NOT EXISTS public.email_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_from TEXT,
  recipient_count INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_batches_created_idx
  ON public.email_batches (created_at DESC);

ALTER TABLE public.email_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.email_batches;
CREATE POLICY "service_role_all" ON public.email_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);
