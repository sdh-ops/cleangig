-- Fix notifications RLS: allow cross-user inserts (workers notifying operators, etc.)
-- The original noti_own policy used FOR ALL with WITH CHECK (user_id = auth.uid()),
-- which silently blocked any insert where user_id != the caller's uid.

DROP POLICY IF EXISTS noti_own ON public.notifications;

-- SELECT: users see only their own notifications
CREATE POLICY noti_select ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: any authenticated user can insert for another user (cross-user notify)
CREATE POLICY noti_insert ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: users update only their own (e.g. mark read)
CREATE POLICY noti_update ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: users delete only their own
CREATE POLICY noti_delete ON public.notifications
  FOR DELETE USING (user_id = auth.uid());
