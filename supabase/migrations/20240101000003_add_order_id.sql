-- Add order_id column to ad_bookings table
alter table public.ad_bookings 
add column order_id text null;
