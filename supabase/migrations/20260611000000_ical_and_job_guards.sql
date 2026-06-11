-- iCal 예약 캘린더 연동 + 작업 상태전이 서버 가드
-- 2026-06-11
--
-- 1. spaces.ical_url — 에어비앤비 등 예약 캘린더 내보내기 URL
-- 2. advance_job_status RPC — 워커 상태 전이를 서버에서 검증
--    (순서 강제 + SUBMITTED 시 완료사진 5장·필수 체크리스트 검증. 클라 조작으로 단계 건너뛰기 차단)
-- 3. request_extra_charge RPC — 추가 청구 금액·권한 서버 검증
-- 4. (재포함, idempotent) spaces.mail_order_no — 이전 마이그레이션 미적용 대비

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS ical_url text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS mail_order_no text;

-- ── 워커 상태 전이 가드 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.advance_job_status(
  p_job_id uuid,
  p_to text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_job record;
  v_photos jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_job FROM jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.worker_id IS DISTINCT FROM v_uid THEN RETURN false; END IF;

  -- 전이 화이트리스트 (순서 강제)
  IF NOT (
    (v_job.status = 'ASSIGNED'    AND p_to = 'EN_ROUTE')    OR
    (v_job.status = 'EN_ROUTE'    AND p_to = 'ARRIVED')     OR
    (v_job.status = 'ARRIVED'     AND p_to = 'IN_PROGRESS') OR
    (v_job.status = 'IN_PROGRESS' AND p_to = 'SUBMITTED')
  ) THEN
    RETURN false;
  END IF;

  IF p_to = 'SUBMITTED' THEN
    v_photos := COALESCE(p_payload->'completion_photos', '[]'::jsonb);
    -- 완료 사진 최소 5장
    IF jsonb_typeof(v_photos) <> 'array' OR jsonb_array_length(v_photos) < 5 THEN
      RETURN false;
    END IF;
    -- 필수 체크리스트 전부 완료 (원본 jobs.checklist 기준, id 또는 label로 대조)
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_job.checklist, '[]'::jsonb)) c
      WHERE COALESCE((c->>'required')::boolean, false)
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(p_payload->'checklist_completed', '[]'::jsonb)) pc
          WHERE COALESCE(pc->>'id', pc->>'label') = COALESCE(c->>'id', c->>'label')
            AND COALESCE((pc->>'completed')::boolean, false)
        )
    ) THEN
      RETURN false;
    END IF;

    UPDATE jobs SET
      status = 'SUBMITTED',
      completed_at = now(),
      checklist_completed = p_payload->'checklist_completed',
      completion_photos = v_photos,
      supply_status = COALESCE(p_payload->'supply_status', supply_status),
      supply_shortages = COALESCE(p_payload->'supply_shortages', supply_shortages),
      updated_at = now()
    WHERE id = p_job_id;
  ELSE
    UPDATE jobs SET
      status = p_to::job_status,
      arrival_unverified = CASE
        WHEN p_to = 'ARRIVED' AND COALESCE((p_payload->>'arrival_unverified')::boolean, false)
        THEN true ELSE arrival_unverified END,
      started_at = CASE WHEN p_to = 'IN_PROGRESS' THEN now() ELSE started_at END,
      updated_at = now()
    WHERE id = p_job_id;
  END IF;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.advance_job_status(uuid, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.advance_job_status(uuid, text, jsonb) TO authenticated;

-- ── 추가 청구 서버 검증 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_extra_charge(
  p_job_id uuid,
  p_amount int,
  p_reason text,
  p_photos jsonb DEFAULT '[]'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_job record;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF p_amount IS NULL OR p_amount < 1000 OR p_amount > 200000 THEN RETURN false; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 OR length(p_reason) > 500 THEN RETURN false; END IF;

  SELECT * INTO v_job FROM jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.worker_id IS DISTINCT FROM v_uid THEN RETURN false; END IF;
  IF v_job.status NOT IN ('IN_PROGRESS', 'SUBMITTED') THEN RETURN false; END IF;
  -- 이미 승인/요청된 청구가 있으면 중복 요청 불가 (거절됐을 땐 재요청 허용)
  IF v_job.extra_charge_status IN ('REQUESTED', 'APPROVED') THEN RETURN false; END IF;

  UPDATE jobs SET
    extra_charge_amount = p_amount,
    extra_charge_reason = trim(p_reason),
    extra_charge_status = 'REQUESTED',
    extra_charge_photos = COALESCE(p_photos, '[]'::jsonb),
    updated_at = now()
  WHERE id = p_job_id;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.request_extra_charge(uuid, int, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.request_extra_charge(uuid, int, text, jsonb) TO authenticated;

-- ── 트리거: 워커의 직접 status/추가청구 변경 차단 ─────────────────────
-- RPC(SECURITY DEFINER, postgres 권한)는 통과하고, 워커 세션의 직접 UPDATE만 막는다.
-- 체크리스트·비품 즉시저장 같은 비상태 필드 업데이트는 영향 없음.
-- 운영자/관리자/서비스롤의 상태 변경(승인·취소 등)도 영향 없음 (auth.uid() ≠ worker_id).
CREATE OR REPLACE FUNCTION public.guard_worker_job_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'authenticated' AND auth.uid() = OLD.worker_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'status_change_requires_rpc' USING HINT = 'advance_job_status()를 사용하세요';
    END IF;
    IF NEW.extra_charge_status IS DISTINCT FROM OLD.extra_charge_status THEN
      RAISE EXCEPTION 'extra_charge_requires_rpc' USING HINT = 'request_extra_charge()를 사용하세요';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_worker_job_update ON public.jobs;
CREATE TRIGGER trg_guard_worker_job_update
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.guard_worker_job_update();
