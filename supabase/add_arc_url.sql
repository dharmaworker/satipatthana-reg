-- 新增 arc_url 欄位：在台外籍居民的 ARC / 居留證圖檔
-- 請在 Supabase Dashboard → SQL Editor 執行

alter table lodging_registrations
  add column if not exists arc_url text;
