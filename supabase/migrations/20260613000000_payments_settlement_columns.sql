-- 정산 상세 컬럼 추가 (approve API paymentRow와 DB 컬럼 불일치 수정)
alter table public.payments
  add column if not exists host_fee int not null default 0,
  add column if not exists host_fee_rate numeric(6,5) not null default 0,
  add column if not exists worker_fee int not null default 0,
  add column if not exists worker_fee_rate numeric(6,5) not null default 0,
  add column if not exists withholding_tax_rate numeric(6,5) not null default 0,
  add column if not exists worker_tax_type text;
