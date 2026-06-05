-- Add total_reviews count to users for display
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0;

-- Trigger to update total_reviews count
CREATE OR REPLACE FUNCTION update_user_review_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.users
  SET total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_update_count ON public.reviews;
CREATE TRIGGER on_review_update_count
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_user_review_count();

-- Add deposit tracking to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deposit_amount integer DEFAULT 0;

NOTIFY pgrst, 'reload schema';
