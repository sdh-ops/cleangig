-- 쓱싹 (Sseuksak) Core Schema
-- 공간 운영 인프라 플랫폼 v1
-- 2026-04-20

-- =============================================
-- Enums
-- =============================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('operator', 'worker', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'space_type') then
    create type space_type as enum ('airbnb', 'partyroom', 'studio', 'gym', 'unmanned_store', 'study_cafe', 'practice_room', 'workspace', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type job_status as enum ('OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'PAID_OUT', 'CANCELED');
  end if;
  if not exists (select 1 from pg_type where typname = 'worker_tier') then
    create type worker_tier as enum ('STARTER', 'SILVER', 'GOLD', 'MASTER');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED');
  end if;
  if not exists (select 1 from pg_type where typname = 'dispute_status') then
    create type dispute_status as enum ('OPEN', 'AUTO_RESOLVED', 'ESCALATED', 'RESOLVED', 'CLOSED');
  end if;
end $$;

-- =============================================
-- users
-- =============================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  name text not null default '',
  role user_role,
  profile_image text,
  tier worker_tier default 'STARTER',
  total_jobs int default 0,
  avg_rating numeric(3,2) default 0,
  sparkle_score int default 0,
  manner_temperature numeric(4,1) default 36.5,
  bio text,
  bank_account jsonb,
  business_name text,
  is_active boolean default true,
  is_verified boolean default false,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists users_role_idx on public.users (role);
create index if not exists users_tier_idx on public.users (tier);

-- =============================================
-- spaces
-- =============================================
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type space_type not null default 'other',
  description text,
  address text not null,
  address_detail text,
  location jsonb,
  size_sqm numeric(6,2),
  size_pyeong numeric(6,2),
  floor_count int,
  cleaning_tool_location text,
  parking_guide text,
  trash_guide text,
  reference_photos text[] default '{}',
  checklist_template jsonb default '[]'::jsonb,
  base_price int not null default 30000,
  estimated_duration int not null default 90,
  cleaning_difficulty text default 'NORMAL',
  photos text[] default '{}',
  biz_type text,
  biz_reg_number text,
  biz_email text,
  biz_reg_image text,
  cash_receipt_number text,
  has_toilet boolean default false,
  has_kitchen boolean default false,
  has_bed boolean default false,
  has_balcony boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists spaces_operator_idx on public.spaces (operator_id);
create index if not exists spaces_type_idx on public.spaces (type);

-- =============================================
-- jobs
-- =============================================
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  operator_id uuid not null references public.users(id) on delete cascade,
  worker_id uuid references public.users(id) on delete set null,
  status job_status not null default 'OPEN',
  scheduled_at timestamptz not null,
  time_window_start timestamptz,
  time_window_end timestamptz,
  estimated_duration int default 90,
  started_at timestamptz,
  completed_at timestamptz,
  price int not null default 0,
  price_breakdown jsonb,
  checklist jsonb default '[]'::jsonb,
  checklist_completed jsonb,
  special_instructions text,
  is_urgent boolean default false,
  is_recurring boolean default false,
  recurring_config jsonb,
  pre_damage_report jsonb,
  matching_score int,
  auto_approved boolean default false,
  preferred_worker_id uuid,
  targeting_worker_id uuid,
  supplies_to_check text[],
  supply_shortages text[],
  extra_charge_amount int default 0,
  extra_charge_reason text,
  cleaning_difficulty text,
  reclean_instructions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists jobs_operator_idx on public.jobs (operator_id);
create index if not exists jobs_worker_idx on public.jobs (worker_id);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_scheduled_idx on public.jobs (scheduled_at);

-- =============================================
-- job_status_logs (immutable)
-- =============================================
create table if not exists public.job_status_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  from_status job_status,
  to_status job_status not null,
  actor_id uuid references public.users(id),
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =============================================
-- worker_locations (immutable GPS trail)
-- =============================================
create table if not exists public.worker_locations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.users(id) on delete cascade,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  recorded_at timestamptz default now()
);

create index if not exists worker_locations_job_idx on public.worker_locations (job_id);

-- =============================================
-- payments
-- =============================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  operator_id uuid not null references public.users(id),
  worker_id uuid references public.users(id),
  gross_amount int not null,
  platform_fee int not null default 0,
  withholding_tax int default 0,
  penalty int default 0,
  bonus int default 0,
  worker_payout int not null default 0,
  status payment_status not null default 'PENDING',
  pg_provider text,
  pg_order_id text,
  pg_payment_key text,
  paid_at timestamptz,
  escrow_released_at timestamptz,
  worker_paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists payments_worker_idx on public.payments (worker_id);

-- =============================================
-- reviews
-- =============================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  reviewer_id uuid not null references public.users(id),
  reviewee_id uuid not null references public.users(id),
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  rating_breakdown jsonb,
  comment text,
  is_public boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- disputes
-- =============================================
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reporter_id uuid not null references public.users(id),
  status dispute_status default 'OPEN',
  category text,
  description text,
  evidence_urls text[] default '{}',
  ai_verdict text,
  ai_confidence numeric(3,2),
  ai_reasoning text,
  final_verdict text,
  refund_amount int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- notifications
-- =============================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, is_read);

-- =============================================
-- favorite_partners
-- =============================================
create table if not exists public.favorite_partners (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.users(id) on delete cascade,
  worker_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (operator_id, worker_id)
);

-- =============================================
-- messages (chat)
-- =============================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists messages_job_idx on public.messages (job_id);

-- =============================================
-- photos
-- =============================================
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  checklist_item_id text,
  uploaded_by uuid references public.users(id),
  url text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =============================================
-- Updated-at triggers
-- =============================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  for t in select unnest(array['users','spaces','jobs','payments','disputes']) loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.tg_set_updated_at();', t);
  end loop;
end $$;

-- =============================================
-- Job status log trigger
-- =============================================
create or replace function public.tg_log_job_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status <> new.status then
    insert into public.job_status_logs (job_id, from_status, to_status, actor_id, meta)
    values (new.id, old.status, new.status, coalesce(auth.uid(), new.worker_id, new.operator_id), '{}'::jsonb);
  end if;
  return new;
end $$;

drop trigger if exists log_job_status on public.jobs;
create trigger log_job_status after update of status on public.jobs
for each row execute function public.tg_log_job_status();

-- =============================================
-- Update users total_jobs & avg_rating after review
-- =============================================
create or replace function public.tg_update_user_rating()
returns trigger language plpgsql as $$
declare
  avg_r numeric;
  cnt int;
begin
  select avg(rating), count(*) into avg_r, cnt
  from public.reviews where reviewee_id = new.reviewee_id;
  update public.users set avg_rating = coalesce(avg_r, 0) where id = new.reviewee_id;
  return new;
end $$;

drop trigger if exists update_user_rating on public.reviews;
create trigger update_user_rating after insert on public.reviews
for each row execute function public.tg_update_user_rating();

-- =============================================
-- RLS policies (minimal, permissive for now)
-- =============================================
alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.jobs enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.favorite_partners enable row level security;
alter table public.messages enable row level security;
alter table public.disputes enable row level security;

-- users: own record + public readable (for names/ratings)
drop policy if exists users_select on public.users;
create policy users_select on public.users for select using (true);
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update using (auth.uid() = id);
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users for insert with check (auth.uid() = id);

-- spaces
drop policy if exists spaces_select on public.spaces;
create policy spaces_select on public.spaces for select using (true);
drop policy if exists spaces_cud_owner on public.spaces;
create policy spaces_cud_owner on public.spaces for all using (operator_id = auth.uid()) with check (operator_id = auth.uid());

-- jobs: operator & worker can read; operator can create; assigned worker can update status
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select using (
  status = 'OPEN' or operator_id = auth.uid() or worker_id = auth.uid()
);
drop policy if exists jobs_insert_op on public.jobs;
create policy jobs_insert_op on public.jobs for insert with check (operator_id = auth.uid());
drop policy if exists jobs_update_parties on public.jobs;
create policy jobs_update_parties on public.jobs for update using (
  operator_id = auth.uid() or worker_id = auth.uid() or (worker_id is null and status = 'OPEN')
);

-- payments
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select using (
  operator_id = auth.uid() or worker_id = auth.uid()
);

-- reviews: public
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (reviewer_id = auth.uid());

-- notifications
drop policy if exists noti_own on public.notifications;
create policy noti_own on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- favorites
drop policy if exists favs_own on public.favorite_partners;
create policy favs_own on public.favorite_partners for all using (operator_id = auth.uid()) with check (operator_id = auth.uid());

-- messages
drop policy if exists msg_self on public.messages;
create policy msg_self on public.messages for all using (sender_id = auth.uid() or receiver_id = auth.uid())
with check (sender_id = auth.uid());

-- disputes
drop policy if exists dispute_self on public.disputes;
create policy dispute_self on public.disputes for all using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());
