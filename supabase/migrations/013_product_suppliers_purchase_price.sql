-- Migration 013: Add purchase_price to product_suppliers

ALTER TABLE public.product_suppliers 
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) CHECK (purchase_price >= 0);
