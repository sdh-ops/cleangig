-- Migration for reviews system

create table public.reviews (
    id uuid default gen_random_uuid() primary key,
    job_id uuid not null references public.jobs(id) on delete cascade,
    reviewer_id uuid not null references public.users(id) on delete cascade,
    reviewee_id uuid not null references public.users(id) on delete cascade,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- users 테이블에 매너 온도(manner_temperature) 추가 (초기값 36.5도)
alter table public.users add column if not exists manner_temperature numeric(4,1) default 36.5 not null;

-- RLS
alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone" on public.reviews
    for select using (true);

create policy "Users can insert their own reviews" on public.reviews
    for insert with check (auth.uid() = reviewer_id);

-- Update manner temperature trigger function
create or replace function public.update_manner_temperature()
returns trigger as $$
declare
    avg_rating numeric;
    new_temp numeric;
begin
    -- 리뷰이의 평균 평점을 계산
    select coalesce(avg(rating), 3.0) into avg_rating from public.reviews where reviewee_id = NEW.reviewee_id;
    
    -- 기본 36.5에서 (평균별점 - 3.0) * 1.5 등을 곱해서 온도를 가감산
    -- 예를 들어 평균 5점이면 36.5 + (2.0 * 1.5) = 39.5도
    new_temp := 36.5 + ((avg_rating - 3.0) * 2.0);
    
    -- 온도가 0도 미만이나 100도 초과가 되지 않도록 방어
    if new_temp > 99.9 then new_temp := 99.9; end if;
    if new_temp < 0.0 then new_temp := 0.0; end if;

    update public.users set manner_temperature = new_temp where id = NEW.reviewee_id;
    return NEW;
end;
$$ language plpgsql security definer;

create trigger on_review_created
    after insert on public.reviews
    for each row execute procedure public.update_manner_temperature();
