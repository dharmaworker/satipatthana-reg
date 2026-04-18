-- satipatthana-reg schema
-- 在 Supabase Dashboard → SQL Editor 貼上執行即可

-- ========== registrations ==========
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  random_code text not null unique,
  member_id text,

  chinese_name text not null,
  passport_name text not null,
  identity text not null,
  dharma_name text,
  gender text not null,
  age int not null,
  passport_country text,
  residence text not null,
  phone text not null,
  email text not null unique,
  line_id text,
  wechat_id text,
  line_qr_url text,
  wechat_qr_url text,

  honest_confirm boolean not null default false,
  attended_formal boolean not null default false,
  watched_recordings boolean not null default false,
  zoom_guidance boolean not null default false,
  watched_30_talks boolean not null default false,
  keep_precepts boolean not null default false,
  pay_confirm boolean not null default false,
  health_confirm boolean not null default false,

  practice_years text,
  practice_frequency text,
  mental_health_note text,
  attended_courses jsonb default '[]'::jsonb,

  status text not null default 'pending',           -- pending | approved | rejected
  payment_status text not null default 'unpaid',    -- unpaid | paid | verified
  payment_plan text,                                -- A1 | A2 | B1 | B2 | C1 | C2 | D1 | D2 | T1 | T2
  payment_note text,
  payment_confirmed_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_registrations_email on registrations(email);
create index if not exists idx_registrations_random_code on registrations(random_code);
create index if not exists idx_registrations_status on registrations(status);

-- ========== admin_users ==========
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null,                               -- admin | readonly | finance
  name text not null,
  created_at timestamptz not null default now()
);

-- ========== RLS ==========
-- 程式全部用 service_role (secret) key 走 supabaseAdmin，不靠 anon 讀寫，
-- 所以直接鎖死 RLS，anon 完全無權限即可。
alter table registrations enable row level security;
alter table admin_users enable row level security;
-- 不建立任何 policy，anon/authenticated 皆無法讀寫，
-- 僅 service_role (bypass RLS) 可操作。
