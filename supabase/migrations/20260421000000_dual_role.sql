-- 쓱싹 Dual Role Support
-- 한 사용자가 공간 파트너(operator) + 클린 파트너(worker) 역할을 모두 가질 수 있게 지원
-- role = 현재 활성화된 모드, can_operate/can_work = 활성화된 역할 목록

alter table public.users
  add column if not exists can_operate boolean default false,
  add column if not exists can_work boolean default false;

-- Backfill: 기존 사용자에게 현재 role 기반으로 flag 세팅
update public.users set can_operate = true where role = 'operator' and (can_operate is null or can_operate = false);
update public.users set can_work = true where role = 'worker' and (can_work is null or can_work = false);
