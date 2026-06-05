-- 비품 상태 (거의 다 씀/없음), 추가 청구, 취소/보증금, 리뷰 방향, 알림 타입

-- jobs: 비품 상태 (level: 'low' | 'out')
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS supply_status jsonb DEFAULT '[]'::jsonb;
-- jobs: 추가 청구 워크플로
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS extra_charge_status text DEFAULT 'NONE'; -- NONE|REQUESTED|APPROVED|REJECTED
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS extra_charge_photos jsonb DEFAULT '[]'::jsonb;
-- jobs: 취소 추적
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS canceled_by uuid;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS canceled_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS cancel_deposit_charged boolean DEFAULT false;

-- reviews: 방향 구분 (양방향 리뷰)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_type text DEFAULT 'operator_to_worker'; -- worker_to_operator | operator_to_worker

-- users: 보증금 환불 추적
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deposit_refunded boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deposit_refunded_at timestamptz;

-- notifications: 알림 분류 타입
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text DEFAULT 'general';

NOTIFY pgrst, 'reload schema';
