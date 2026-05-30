-- 記錄報名當下是哪個報名階段（open / late）
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS registration_phase TEXT NOT NULL DEFAULT 'open';
