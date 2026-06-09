-- Fix cleaning_difficulty: change default and backfill English values → Korean
-- Background: DB schema used 'NORMAL' as default but app code uses '보통'/'쉬움'/'어려움'.
-- Spaces created before this fix may have 'NORMAL'/'EASY'/'HARD' which break the Korean filter.

-- 1. Backfill existing rows
UPDATE public.spaces
SET cleaning_difficulty = CASE cleaning_difficulty
  WHEN 'NORMAL' THEN '보통'
  WHEN 'EASY'   THEN '쉬움'
  WHEN 'HARD'   THEN '어려움'
  ELSE cleaning_difficulty  -- already Korean, leave as-is
END
WHERE cleaning_difficulty IN ('NORMAL', 'EASY', 'HARD');

-- 2. Fix column default
ALTER TABLE public.spaces
  ALTER COLUMN cleaning_difficulty SET DEFAULT '보통';

-- 3. Same fix for jobs table (has a separate cleaning_difficulty column)
UPDATE public.jobs
SET cleaning_difficulty = CASE cleaning_difficulty
  WHEN 'NORMAL' THEN '보통'
  WHEN 'EASY'   THEN '쉬움'
  WHEN 'HARD'   THEN '어려움'
  ELSE cleaning_difficulty
END
WHERE cleaning_difficulty IN ('NORMAL', 'EASY', 'HARD');

ALTER TABLE public.jobs
  ALTER COLUMN cleaning_difficulty SET DEFAULT '보통';

NOTIFY pgrst, 'reload schema';
