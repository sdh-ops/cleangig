-- jobs: 완료 증거 사진 배열 (worker가 SUBMITTED 시 필수 1장 이상 업로드)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completion_photos jsonb DEFAULT '[]'::jsonb;
