create table public.ad_bookings (
  id uuid not null default gen_random_uuid (),
  selected_date date not null,
  status text not null default 'pending'::text,
  buyer_name text null,
  buyer_contact text null,
  created_at timestamp with time zone not null default now(),
  constraint ad_bookings_pkey primary key (id),
  constraint ad_bookings_selected_date_key unique (selected_date)
);

-- Enable RLS
alter table public.ad_bookings enable row level security;

-- Allow public read access (so everyone can see which dates are booked)
create policy "Allow public read access"
  on public.ad_bookings
  for select
  to public
  using (true);

-- Allow authenticated (service role) insert/update (for webhooks)
create policy "Allow service role insert/update"
  on public.ad_bookings
  for all
  to service_role
  using (true)
  with check (true);
