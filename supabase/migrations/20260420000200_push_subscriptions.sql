-- 쓱싹 Push Subscriptions

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_self on public.push_subscriptions;
create policy push_self on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
