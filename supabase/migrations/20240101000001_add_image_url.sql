-- Add image_url column to ad_bookings table
alter table public.ad_bookings 
add column image_url text null;

-- Create storage bucket for ad images if it doesn't exist
insert into storage.buckets (id, name, public)
values ('ad-images', 'ad-images', true)
on conflict (id) do nothing;

-- Allow public access to ad-images bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'ad-images' );

-- Allow authenticated uploads to ad-images bucket
create policy "Authenticated Uploads"
  on storage.objects for insert
  to public
  with check ( bucket_id = 'ad-images' );
