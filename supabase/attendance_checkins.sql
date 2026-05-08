-- 課程完成度簽到表
CREATE TABLE IF NOT EXISTS attendance_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id uuid UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  attendance_status text NOT NULL CHECK (attendance_status IN ('full', 'partial', 'absent')),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE attendance_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_service_role" ON attendance_checkins
  USING (true) WITH CHECK (true);
