-- 출입 정보 + 주의사항 컬럼 추가
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS entry_code text,
  ADD COLUMN IF NOT EXISTS caution_notes text;

-- 민감정보 동의 기록 테이블
CREATE TABLE IF NOT EXISTS public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  kind        text not null,   -- 'SENSITIVE_ID' | 'MARKETING' | 'LOCATION' | 'TERMS' | 'PRIVACY'
  agreed      boolean not null default true,
  version     text not null default 'v1',
  created_at  timestamptz default now()
);

CREATE INDEX IF NOT EXISTS consents_user_idx ON public.consents (user_id);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own consents"
  ON public.consents
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 1:1 문의/지원 티켓 테이블
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  category    text not null,   -- 'payment' | 'match' | 'quality' | 'account' | 'other'
  title       text not null,
  body        text not null,
  status      text not null default 'OPEN', -- 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  job_id      uuid references public.jobs(id) on delete set null,
  reply       text,
  replied_at  timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users view own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users create own tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admins manage all tickets"
  ON public.support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
