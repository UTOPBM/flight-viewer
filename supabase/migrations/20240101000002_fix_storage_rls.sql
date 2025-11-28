-- Ensure ad-images bucket exists and is public
insert into storage.buckets (id, name, public)
values ('ad-images', 'ad-images', true)
on conflict (id) do nothing;

-- Drop existing policies to avoid conflicts/duplication
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Uploads" on storage.objects;
drop policy if exists "Public Uploads" on storage.objects;

-- Allow public read access (Select)
create policy "Public Access"
  on storage.objects for select
  to public
  using ( bucket_id = 'ad-images' );

-- Allow public insert access (Uploads) - This allows anon users to upload
create policy "Public Uploads"
  on storage.objects for insert
  to public
  with check ( bucket_id = 'ad-images' );

-- Allow public update access (optional, but good for overwrites if needed)
create policy "Public Updates"
  on storage.objects for update
  to public
  using ( bucket_id = 'ad-images' );
