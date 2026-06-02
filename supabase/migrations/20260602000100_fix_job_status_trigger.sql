-- job_status_logs 트리거 함수 수정.
-- fix_spaces_schema_v2 가 테이블 컬럼을 actor_id→changed_by 로 변경했으나
-- 트리거 함수가 업데이트되지 않아 모든 작업 상태전이가 실패하던 문제를 수정한다.

create or replace function public.tg_log_job_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status <> new.status then
    insert into public.job_status_logs (job_id, from_status, to_status, changed_by)
    values (
      new.id,
      old.status,
      new.status,
      coalesce(auth.uid(), new.worker_id, new.operator_id)
    );
  end if;
  return new;
end $$;
