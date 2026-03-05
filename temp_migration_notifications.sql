-- notifications 테이블 생성
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (자신의 알림만 조회/수정 가능)
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 알림 추가 기능이 편하도록 RPC (선택)
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_url TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, url)
  VALUES (p_user_id, p_title, p_message, p_url);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
