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

-- ========== lodging_registrations ==========
create table if not exists lodging_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade unique,

  -- 以下欄位皆 nullable，允許食宿登記與快篩上傳分段填寫
  arrival_date date,                  -- 2026-08-19 or 2026-08-20（由 payment_plan 推導）
  departure_date date,                -- 2026-08-24 or 2026-08-25（同上）
  payment_method text,                -- transfer | credit_card（同上）

  emergency_name text,
  emergency_relation text,
  emergency_phone text,

  arrival_transport text,             -- self | taipei_bus | wuri_bus
  departure_transport text,           -- self | bus
  bus_destination text,               -- taipei_824_pm | taipei_825_am | wuri_825_am

  diet text,                          -- meat | vegetarian
  noon_fasting text,                  -- before_noon | after_noon
  snacks text,                        -- snacks_and_drink | drink_only
  dinner_0819 boolean,
  dinner_0824 boolean,

  snoring boolean,
  agree_covid_rules boolean,

  -- 檔案上傳（Supabase Storage bucket `lodging-docs` 的 public URL）
  id_front_url text,
  id_back_url text,
  passport_url text,
  photo_url text,
  arrival_ticket_url text,
  departure_ticket_url text,
  test_0817_url text,
  test_0819_url text,
  -- 8/20 與 8/22 快篩結果改為現場繳交，故不存 DB

  -- 國外學員航班
  flight_arrival_date date,
  flight_arrival_time text,
  flight_departure_date date,
  flight_departure_time text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table lodging_registrations enable row level security;

-- ========== scheduled_exports ==========
create table if not exists scheduled_exports (
  id uuid primary key default gen_random_uuid(),
  scheduled_at timestamptz not null,
  recipients text[] not null default '{}',
  enabled boolean not null default true,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
alter table scheduled_exports enable row level security;

-- ========== RLS ==========
-- 程式全部用 service_role (secret) key 走 supabaseAdmin，不靠 anon 讀寫，
-- 所以直接鎖死 RLS，anon 完全無權限即可。
alter table registrations enable row level security;
alter table admin_users enable row level security;
-- 不建立任何 policy，anon/authenticated 皆無法讀寫，
-- 僅 service_role (bypass RLS) 可操作。
