-- Fix 1: rating 컬럼을 decimal로 변경 (3개 카테고리 평균이 소수점 발생)
ALTER TABLE public.reviews ALTER COLUMN rating TYPE numeric(3,1) USING rating::numeric;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

-- Fix 2: 리뷰 등록 시 users.avg_rating 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_user_avg_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.users
  SET avg_rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM public.reviews
    WHERE reviewee_id = NEW.reviewee_id
  )
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_update_avg_rating ON public.reviews;
CREATE TRIGGER on_review_update_avg_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_user_avg_rating();

NOTIFY pgrst, 'reload schema';
