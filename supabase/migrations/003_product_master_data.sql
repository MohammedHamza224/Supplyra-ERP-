-- Migration 003: Product Master Data

-- 1. Categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_categories_updated_at 
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 2. Brands
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_brands_updated_at 
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 3. Units
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- e.g., 'CTN', 'PCS'
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_units_updated_at 
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- Insert common units
INSERT INTO public.units (name, code) VALUES
    ('Carton', 'CTN'),
    ('Piece', 'PCS'),
    ('Kilogram', 'KG'),
    ('Box', 'BOX');

-- 4. Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    brand_id UUID REFERENCES public.brands(id),
    unit_id UUID NOT NULL REFERENCES public.units(id),
    barcode TEXT UNIQUE,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER handle_products_updated_at 
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 5. Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Basic access policies for authenticated users
CREATE POLICY "Allow authenticated full access to categories" ON public.categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to brands" ON public.brands FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to units" ON public.units FOR ALL TO authenticated USING (true);

-- Product access: everyone can view, but future enhancement will restrict purchase_price for Sales
CREATE POLICY "Allow authenticated full access to products" ON public.products FOR ALL TO authenticated USING (true);
