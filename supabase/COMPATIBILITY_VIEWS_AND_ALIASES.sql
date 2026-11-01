-- ==============================================================
-- SUPPLYRA ERP: SCHEMA HARMONIZATION & COMPATIBILITY LAYER
-- Adds alias generated columns and company_settings table
-- Idempotent & Non-Destructive
-- ==============================================================

-- 1. Orders: Ensure grand_total and order_date aliases exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'grand_total'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN grand_total NUMERIC(12,2) GENERATED ALWAYS AS (total_amount) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_date'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN order_date DATE GENERATED ALWAYS AS (created_at::DATE) STORED;
  END IF;
END $$;

-- 2. Purchases: Ensure grand_total and purchase_date aliases exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'grand_total'
  ) THEN
    ALTER TABLE public.purchases ADD COLUMN grand_total NUMERIC(12,2) GENERATED ALWAYS AS (total_amount) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE public.purchases ADD COLUMN purchase_date DATE GENERATED ALWAYS AS (issue_date) STORED;
  END IF;
END $$;

-- 3. Order Items: Ensure total alias exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN total NUMERIC(12,2) GENERATED ALWAYS AS (subtotal) STORED;
  END IF;
END $$;

-- 4. Purchase Items: Ensure total and purchase_price aliases exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_items' AND column_name = 'total'
  ) THEN
    ALTER TABLE public.purchase_items ADD COLUMN total NUMERIC(12,2) GENERATED ALWAYS AS (subtotal) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_items' AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE public.purchase_items ADD COLUMN purchase_price NUMERIC(12,2) GENERATED ALWAYS AS (unit_cost) STORED;
  END IF;
END $$;

-- 5. Customers: Ensure mobile alias exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN mobile TEXT GENERATED ALWAYS AS (phone) STORED;
  END IF;
END $$;

-- 6. Inventory Batches: Ensure active alias exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_batches' AND column_name = 'active'
  ) THEN
    ALTER TABLE public.inventory_batches ADD COLUMN active BOOLEAN GENERATED ALWAYS AS (quantity > 0) STORED;
  END IF;
END $$;

-- 7. Company Settings Table (Harmonized with Business Settings)
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name TEXT NOT NULL DEFAULT 'Supplyra ERP',
    company_name TEXT NOT NULL DEFAULT 'Supplyra ERP',
    logo_url TEXT,
    phone TEXT DEFAULT '+966 50 000 0000',
    address TEXT DEFAULT 'Riyadh, Saudi Arabia',
    vat_rate NUMERIC(5,2) DEFAULT 15.00,
    tax_number TEXT DEFAULT '310000000000003',
    currency TEXT DEFAULT 'SAR',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_auth_all_company_settings" ON public.company_settings;
CREATE POLICY "allow_auth_all_company_settings" ON public.company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.company_settings (system_name, company_name, phone, address, vat_rate, tax_number, currency)
VALUES ('Supplyra ERP', 'Supplyra ERP', '+966 50 000 0000', 'Riyadh, Saudi Arabia', 15.00, '310000000000003', 'SAR')
ON CONFLICT DO NOTHING;
