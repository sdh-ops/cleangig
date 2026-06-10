-- =============================================
-- 비품 체크 요청 항목
-- 공간파트너가 청소 요청 시 "이 공간에서 확인할 비품"을 선택 →
-- 클린파트너는 그 항목만 체크. 비어 있으면 워커 화면에 비품 카드 미표시.
-- =============================================

alter table public.jobs
  add column if not exists supply_check_items text[] not null default '{}';

comment on column public.jobs.supply_check_items is
  '공간파트너가 요청 시 선택한, 클린파트너가 상태를 체크할 비품 목록. 비어 있으면 비품 체크 안 함.';
