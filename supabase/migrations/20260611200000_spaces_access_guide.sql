-- 현장 세부 진입 안내 (네이버 지도에 없는 건물 내부 찾아가는 방법)
alter table public.spaces
  add column if not exists access_guide text;
