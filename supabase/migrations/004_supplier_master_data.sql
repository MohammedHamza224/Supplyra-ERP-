-- Migration 004: Supplier Master Data

-- 1. Suppliers
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_suppliers_updated_at 
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 2. Product Suppliers (Many-to-Many)
CREATE TABLE public.product_suppliers (
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    supplier_product_code TEXT,
    is_preferred BOOLEAN NOT NULL DEFAULT false,
    lead_time_days INTEGER CHECK (lead_time_days >= 0),
    minimum_order_quantity NUMERIC(12,2) CHECK (minimum_order_quantity >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, supplier_id)
);

CREATE TRIGGER handle_product_suppliers_updated_at 
  BEFORE UPDATE ON public.product_suppliers
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 3. Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to suppliers" ON public.suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to product_suppliers" ON public.product_suppliers FOR ALL TO authenticated USING (true);
