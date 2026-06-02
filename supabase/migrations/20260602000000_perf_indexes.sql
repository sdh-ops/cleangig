-- 핫패스 인덱스 보강 (additive, 안전)
-- 기존 스키마에 없던 자주 조회되는 외래키 컬럼에 인덱스 추가.

-- payments.job_id: cancel / auto-approve / dispute-resolve / earnings가 job_id로 조회·갱신
create index if not exists payments_job_idx on public.payments (job_id);

-- reviews.reviewee_id: on_review_created 트리거가 리뷰 등록마다 reviewee_id로 avg 집계
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);

-- disputes.job_id: 분쟁 ↔ 작업 조회 (admin 해결 시)
create index if not exists disputes_job_idx on public.disputes (job_id);

-- favorite_partners.operator_id: 요청 상세에서 단골 여부 확인
create index if not exists favs_operator_idx on public.favorite_partners (operator_id);
