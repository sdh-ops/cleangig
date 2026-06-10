-- 보안 강화: 알림 주입 차단 + 잔존 임시 정책 정리
-- 2026-06-10
--
-- 1. notifications INSERT — "로그인만 하면 누구에게나 삽입"(noti_insert WITH CHECK auth.uid() IS NOT NULL)을
--    "본인 또는 job으로 연결된 상대방에게만"으로 제한.
--    서버 발송(lib/notify.ts)은 service_role이라 RLS 무관.
--    클라이언트 직접 발송(lib/notifications.ts)은 작업 상태 변경 알림 — 같은 job의 상대방에게만 필요.
-- 2. temp_migration*.sql이 수동 적용됐을 경우 잔존하는 느슨한 정책/RPC 제거:
--    - favorite_partners USING(true) SELECT 2종
--    - notifications "System can insert notifications" WITH CHECK(true)
--    - notify_user SECURITY DEFINER RPC (anon key만으로 임의 사용자 알림 삽입 가능)

-- ── notifications INSERT 강화 ──────────────────────────────────────
DROP POLICY IF EXISTS noti_insert ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY noti_insert ON public.notifications
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE (j.operator_id = auth.uid() AND j.worker_id = user_id)
         OR (j.worker_id = auth.uid() AND j.operator_id = user_id)
    )
  );

-- ── temp 잔존 정책 정리: favorite_partners ─────────────────────────
DROP POLICY IF EXISTS "Operators can view their favorite partners" ON public.favorite_partners;
DROP POLICY IF EXISTS "Workers can view who favorited them" ON public.favorite_partners;
DROP POLICY IF EXISTS "Operators can add favorite partners" ON public.favorite_partners;
DROP POLICY IF EXISTS "Operators can remove favorite partners" ON public.favorite_partners;

-- 워커가 자신을 단골 등록한 운영자 확인 가능 (favs_own은 operator만 커버)
DROP POLICY IF EXISTS favs_worker_select ON public.favorite_partners;
CREATE POLICY favs_worker_select ON public.favorite_partners
  FOR SELECT USING (worker_id = auth.uid());

-- ── notify_user RPC 제거 (RLS 우회 SECURITY DEFINER) ────────────────
DROP FUNCTION IF EXISTS public.notify_user(uuid, text, text, text);

-- ── 공간 통신판매업 신고번호 컬럼 (입력 UI는 있으나 저장 컬럼 부재였음) ──
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS mail_order_no text;
