-- 쓱싹 Payment & Tax - 한국 법 기준
-- 2026-04-21

-- =============================================
-- platform_settings (수수료/세율 설정, 관리자 편집 가능)
-- =============================================
create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references public.users(id)
);

-- Default fee rates: host 5% + worker 5% + 원천징수 3.3% (프리랜서)
insert into public.platform_settings (key, value, description) values
  ('fees', '{"host_fee_rate": 0.05, "worker_fee_rate": 0.05, "withholding_tax_rate": 0.033, "vat_rate": 0.10}'::jsonb,
    '호스트/워커 수수료율, 원천징수율, 부가세율'),
  ('urgency', '{"urgent_fee": 10000, "night_multiplier": 0.2, "night_start_hour": 22, "night_end_hour": 6}'::jsonb,
    '긴급/심야 할증 정책'),
  ('cancel_policy', '{"free_hours": 24, "light_rate": 0.3, "heavy_rate": 0.5, "heavy_hours": 1}'::jsonb,
    '취소 정책 (호스트 취소 기준)'),
  ('worker_penalty', '{"late_10min_fee": 5000, "noshow_warning": 1, "noshow_suspend": 2}'::jsonb,
    '워커 지각/노쇼 페널티')
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists settings_read on public.platform_settings;
create policy settings_read on public.platform_settings for select using (true);

-- Only admins can update; we trust isPlatformAdmin() on server routes for inserts/updates

-- =============================================
-- users: 세금 유형 + 사업자 정보 (양측 공용)
-- =============================================
alter table public.users
  add column if not exists tax_type text, -- 'FREELANCER' | 'INDIVIDUAL_BUSINESS' | 'BUSINESS'
  add column if not exists biz_reg_number text,
  add column if not exists biz_reg_image text,
  add column if not exists biz_email text,
  add column if not exists biz_holder text, -- 대표자명
  add column if not exists biz_name text,   -- 상호명
  add column if not exists biz_type text,   -- 업태
  add column if not exists biz_category text, -- 종목
  add column if not exists biz_vat_type text, -- 'GENERAL' | 'SIMPLE' | 'EXEMPT'
  add column if not exists resident_id_last text, -- 원천징수 신고용 주민번호 뒷자리 (암호화 권장)
  add column if not exists age_verified boolean default false,
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists location_agreed_at timestamptz,
  add column if not exists marketing_agreed_at timestamptz;

-- =============================================
-- spaces: 과세 구분 + 세금계산서 발행 의사 (이미 일부 있음, 보강)
-- =============================================
alter table public.spaces
  add column if not exists vat_type text default 'EXEMPT', -- 'GENERAL' | 'SIMPLE' | 'EXEMPT'
  add column if not exists tax_invoice_required boolean default false;

-- =============================================
-- payments: 세분화된 fee breakdown + 세금 계산서
-- =============================================
alter table public.payments
  add column if not exists host_fee int default 0,
  add column if not exists host_fee_rate numeric(6,4) default 0.05,
  add column if not exists worker_fee int default 0,
  add column if not exists worker_fee_rate numeric(6,4) default 0.05,
  add column if not exists withholding_tax_rate numeric(6,4) default 0.033,
  add column if not exists worker_tax_type text,
  add column if not exists cash_receipt_number text, -- 현금영수증 번호
  add column if not exists cash_receipt_purpose text, -- 'PERSONAL' | 'BUSINESS'
  add column if not exists tax_invoice_issued boolean default false,
  add column if not exists tax_invoice_number text,
  add column if not exists vat_amount int default 0;

-- =============================================
-- tax_reports: 월별/연간 원천징수 리포트 (워커 연말정산 자료)
-- =============================================
create table if not exists public.tax_reports (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete cascade,
  period text not null, -- 'YYYY-MM' or 'YYYY'
  period_type text not null default 'MONTH', -- 'MONTH' | 'YEAR'
  gross_income int not null default 0,
  withholding_tax int not null default 0,
  local_tax int not null default 0,
  net_paid int not null default 0,
  tx_count int not null default 0,
  created_at timestamptz default now(),
  unique (worker_id, period, period_type)
);

create index if not exists tax_reports_worker_idx on public.tax_reports (worker_id, period);

alter table public.tax_reports enable row level security;
drop policy if exists tax_reports_self on public.tax_reports;
create policy tax_reports_self on public.tax_reports for select using (worker_id = auth.uid());

-- =============================================
-- consents: 약관 동의 이력 (감사 추적)
-- =============================================
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null, -- 'TERMS' | 'PRIVACY' | 'LOCATION' | 'MARKETING' | 'SENSITIVE_ID' (주민번호 수집)
  version text not null default 'v1',
  agreed boolean not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists consents_user_idx on public.consents (user_id, kind);

alter table public.consents enable row level security;
drop policy if exists consents_self on public.consents;
create policy consents_self on public.consents for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================
-- updated_at trigger for platform_settings
-- =============================================
drop trigger if exists settings_updated_at on public.platform_settings;
create trigger settings_updated_at before update on public.platform_settings
  for each row execute function public.tg_set_updated_at();
