-- 新增 student_id 欄位：R-001/R-002 格式，由食宿管理頁手動編
-- 請在 Supabase Dashboard → SQL Editor 執行

alter table registrations
  add column if not exists student_id text;

-- 重複性約束（同一 student_id 不能分給兩個人）
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'registrations_student_id_key'
  ) then
    alter table registrations add constraint registrations_student_id_key unique (student_id);
  end if;
end $$;

create index if not exists idx_registrations_student_id on registrations(student_id);
