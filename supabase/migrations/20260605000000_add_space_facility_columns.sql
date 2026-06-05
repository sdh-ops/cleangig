-- Add missing facility columns to spaces table
-- These columns track available facilities in a space

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS has_toilet boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_kitchen boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_bed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_balcony boolean DEFAULT false;

-- Add business/tax columns if missing
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS biz_type text,
  ADD COLUMN IF NOT EXISTS biz_reg_number text,
  ADD COLUMN IF NOT EXISTS biz_email text,
  ADD COLUMN IF NOT EXISTS biz_reg_image text,
  ADD COLUMN IF NOT EXISTS vat_type text DEFAULT 'EXEMPT',
  ADD COLUMN IF NOT EXISTS tax_invoice_required boolean DEFAULT false;

-- Add reference_photos if missing
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS reference_photos text[] DEFAULT '{}';

-- Add cleaning_difficulty if missing (NORMAL/EASY/HARD)
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS cleaning_difficulty text DEFAULT 'NORMAL';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
