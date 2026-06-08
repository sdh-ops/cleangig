-- 공간 출입 보안정보 — 가변 목록
-- 호스트가 공간마다 이름(label)을 붙여 비밀번호(value)를 자유롭게 추가
-- 예: [{ "label": "공동현관", "value": "1234" }, { "label": "청소도구함", "value": "5678*" }]
-- 기존 entry_code(text)는 하위호환용으로 유지
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS access_codes jsonb DEFAULT '[]'::jsonb;

-- PostgREST 스키마 캐시 갱신
NOTIFY pgrst, 'reload schema';
