-- 課前共修公開時間：時間到自動對學員開放（不需 cron，client 端比對）
ALTER TABLE practice_config ADD COLUMN IF NOT EXISTS open_at TIMESTAMPTZ;
