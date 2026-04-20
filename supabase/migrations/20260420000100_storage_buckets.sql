-- 쓱싹 Storage Buckets & Policies

-- Create buckets (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('spaces', 'spaces', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('profiles', 'profiles', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('photos', 'photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('reviews', 'reviews', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('docs', 'docs', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS policies: authenticated users can manage own-prefixed files
-- Pattern: path starts with user's uid followed by '/'

-- spaces
drop policy if exists "sseuksak_spaces_read" on storage.objects;
create policy "sseuksak_spaces_read" on storage.objects for select
  using (bucket_id = 'spaces');

drop policy if exists "sseuksak_spaces_insert" on storage.objects;
create policy "sseuksak_spaces_insert" on storage.objects for insert
  with check (bucket_id = 'spaces' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "sseuksak_spaces_update" on storage.objects;
create policy "sseuksak_spaces_update" on storage.objects for update
  using (bucket_id = 'spaces' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "sseuksak_spaces_delete" on storage.objects;
create policy "sseuksak_spaces_delete" on storage.objects for delete
  using (bucket_id = 'spaces' and (storage.foldername(name))[1] = auth.uid()::text);

-- profiles (same pattern)
drop policy if exists "sseuksak_profiles_read" on storage.objects;
create policy "sseuksak_profiles_read" on storage.objects for select
  using (bucket_id = 'profiles');

drop policy if exists "sseuksak_profiles_insert" on storage.objects;
create policy "sseuksak_profiles_insert" on storage.objects for insert
  with check (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "sseuksak_profiles_update" on storage.objects;
create policy "sseuksak_profiles_update" on storage.objects for update
  using (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "sseuksak_profiles_delete" on storage.objects;
create policy "sseuksak_profiles_delete" on storage.objects for delete
  using (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);

-- photos (job photos - read by anyone, write by worker)
drop policy if exists "sseuksak_photos_read" on storage.objects;
create policy "sseuksak_photos_read" on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "sseuksak_photos_insert" on storage.objects;
create policy "sseuksak_photos_insert" on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "sseuksak_photos_update" on storage.objects;
create policy "sseuksak_photos_update" on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- reviews
drop policy if exists "sseuksak_reviews_read" on storage.objects;
create policy "sseuksak_reviews_read" on storage.objects for select
  using (bucket_id = 'reviews');

drop policy if exists "sseuksak_reviews_insert" on storage.objects;
create policy "sseuksak_reviews_insert" on storage.objects for insert
  with check (bucket_id = 'reviews' and (storage.foldername(name))[1] = auth.uid()::text);

-- docs (private)
drop policy if exists "sseuksak_docs_owner" on storage.objects;
create policy "sseuksak_docs_owner" on storage.objects for all
  using (bucket_id = 'docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'docs' and (storage.foldername(name))[1] = auth.uid()::text);
