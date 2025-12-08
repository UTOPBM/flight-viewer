-- Create affiliate_products table
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  price TEXT,
  rating NUMERIC,
  review_count INTEGER,
  original_url TEXT UNIQUE NOT NULL,
  partner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create city_mappings table
CREATE TABLE IF NOT EXISTS public.city_mappings (
  airport_code TEXT PRIMARY KEY,
  city_name_ko TEXT NOT NULL,
  city_name_en TEXT,
  country TEXT
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_affiliate_products_city ON public.affiliate_products(city);
