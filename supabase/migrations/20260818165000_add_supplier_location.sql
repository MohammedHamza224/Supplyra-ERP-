-- Migration: Add location columns to suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8);
