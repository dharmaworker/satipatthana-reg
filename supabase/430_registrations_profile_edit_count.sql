-- 學員個人資料自助修改次數（上限 2 次）
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS profile_edit_count INT NOT NULL DEFAULT 0;
