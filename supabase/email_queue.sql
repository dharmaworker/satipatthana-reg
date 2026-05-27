-- 1. Main table (already in prod, codify for schema dump)
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  bcc TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|sent|failed|bounced|delivered
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT
);

-- 2. Tracking columns (new)
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'alicloud',
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS mail_type TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.email_batches(id) ON DELETE SET NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS email_queue_provider_msg_idx
  ON public.email_queue (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_queue_status_created_idx
  ON public.email_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS email_queue_to_email_idx
  ON public.email_queue (to_email, created_at DESC);
CREATE INDEX IF NOT EXISTS email_queue_parent_id_idx
  ON public.email_queue (parent_id)
  WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_queue_batch_id_idx
  ON public.email_queue (batch_id)
  WHERE batch_id IS NOT NULL;

-- 4. RLS (service_role only)
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.email_queue;
CREATE POLICY "service_role_all" ON public.email_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
