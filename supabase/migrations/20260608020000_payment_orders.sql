-- payment_orders: Toss 결제 전 임시 주문 테이블
-- 결제 완료 후 job + payment 레코드 생성에 필요한 데이터를 보관
-- 2026-06-08

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id text PRIMARY KEY, -- orderId: sseuksak-{timestamp}-{random6}
  operator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_data jsonb NOT NULL,           -- 결제 완료 후 job 생성에 쓸 전체 페이로드
  amount int NOT NULL,               -- 결제 금액 (검증용)
  order_name text NOT NULL DEFAULT '쓱싹 청소',
  status text NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED | FAILED | EXPIRED
  pg_payment_key text,               -- Toss paymentKey (검증 완료 후 저장)
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '30 minutes')
);

CREATE INDEX IF NOT EXISTS payment_orders_operator_idx ON public.payment_orders (operator_id);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON public.payment_orders (status, expires_at);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 본인 주문만 접근 가능
DROP POLICY IF EXISTS payment_orders_own ON public.payment_orders;
CREATE POLICY payment_orders_own ON public.payment_orders
  FOR ALL
  USING (operator_id = auth.uid())
  WITH CHECK (operator_id = auth.uid());

-- 만료 주문 자동 정리 (PENDING 상태에서 30분 경과)
-- 실제 운영에서는 pg_cron 또는 Vercel cron으로 처리 권장
