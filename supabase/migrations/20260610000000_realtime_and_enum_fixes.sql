-- =============================================
-- 1차 개편 Phase 0: realtime publication + payment enum + claim_job
-- =============================================

-- ---------------------------------------------
-- 1) Realtime publication — 레포를 source of truth로
--    (기존 채널은 대시보드에서 수동 활성화된 상태일 수 있어 중복 가드 필수)
-- ---------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['jobs', 'messages', 'notifications', 'worker_locations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------
-- 2) payment_status enum에 PAID_OUT 추가
--    (jobs enum·lib/types.ts엔 이미 존재 — 정산 추적 불일치 해소)
--    주의: 새 enum 값은 같은 트랜잭션에서 사용 불가 → 이 마이그레이션에서는 추가만
-- ---------------------------------------------
alter type payment_status add value if not exists 'PAID_OUT';

-- ---------------------------------------------
-- 3) 위치 미확인 도착 플래그
--    (워커가 위치 권한 거부 시 침묵 통과 대신 명시 동의 + 기록)
-- ---------------------------------------------
alter table public.jobs add column if not exists arrival_unverified boolean not null default false;

-- ---------------------------------------------
-- 4) claim_job — 워커 지원 원자적 처리
--    OPEN + worker_id null인 경우에만 배정. 동시 탭 시 한 명만 성공.
-- ---------------------------------------------
create or replace function public.claim_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.jobs
  set worker_id = v_uid,
      status = 'ASSIGNED',
      updated_at = now()
  where id = p_job_id
    and status = 'OPEN'
    and worker_id is null
    and operator_id <> v_uid; -- 본인 요청에 본인 지원 방지

  return found;
end;
$$;

revoke all on function public.claim_job(uuid) from public;
grant execute on function public.claim_job(uuid) to authenticated;

notify pgrst, 'reload schema';
