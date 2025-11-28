-- Add link_url column to ad_bookings table
alter table public.ad_bookings 
add column link_url text null;
