-- 후기 태그 + 사업자 주소 필드 추가

-- reviews 테이블: tags 컬럼 (미리 정의된 태그 배열)
alter table public.reviews
  add column if not exists tags text[] not null default '{}';

-- users 테이블: biz_address 컬럼 (사업자 등록 주소)
alter table public.users
  add column if not exists biz_address text;
