CREATE TABLE IF NOT EXISTS public.favorite_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(operator_id, worker_id)
);

ALTER TABLE public.favorite_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view their favorite partners" ON public.favorite_partners FOR SELECT USING (true);
CREATE POLICY "Workers can view who favorited them" ON public.favorite_partners FOR SELECT USING (true);
CREATE POLICY "Operators can add favorite partners" ON public.favorite_partners FOR INSERT WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Operators can remove favorite partners" ON public.favorite_partners FOR DELETE USING (auth.uid() = operator_id);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS preferred_worker_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
