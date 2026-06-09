-- Remove test account from admin RLS policies
-- worker@sseuksak-test.com was added temporarily for E2E testing

-- Drop and recreate admin policies without the test account

-- payments SELECT
DROP POLICY IF EXISTS "admin: 전체 payments 조회" ON public.payments;
CREATE POLICY "admin: 전체 payments 조회" ON public.payments FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN ('admin@cleangig.com', 'brianshin0815@gmail.com')
    OR operator_id = auth.uid()
    OR worker_id = auth.uid()
  );

-- payments UPDATE
DROP POLICY IF EXISTS "admin: payments 상태 변경" ON public.payments;
CREATE POLICY "admin: payments 상태 변경" ON public.payments FOR UPDATE
  USING (auth.jwt() ->> 'email' IN ('admin@cleangig.com', 'brianshin0815@gmail.com'))
  WITH CHECK (true);

-- notifications INSERT (admin)
DROP POLICY IF EXISTS "admin: notifications 전송" ON public.notifications;
CREATE POLICY "admin: notifications 전송" ON public.notifications FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@cleangig.com', 'brianshin0815@gmail.com')
    OR auth.uid() = user_id
  );

-- jobs UPDATE (admin)
DROP POLICY IF EXISTS "admin: jobs 상태 변경" ON public.jobs;
CREATE POLICY "admin: jobs 상태 변경" ON public.jobs FOR UPDATE
  USING (auth.jwt() ->> 'email' IN ('admin@cleangig.com', 'brianshin0815@gmail.com'))
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
