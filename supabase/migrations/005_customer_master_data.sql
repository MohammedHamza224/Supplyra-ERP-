-- Migration 005: Customer Master Data

-- 1. Customers
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    region TEXT,
    contact_person TEXT,
    tax_number TEXT,
    payment_type TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_type IN ('Cash', 'Credit')),
    credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
    payment_terms_days INTEGER NOT NULL DEFAULT 0 CHECK (payment_terms_days >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER handle_customers_updated_at 
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 2. Customer Locations (One-to-Many)
CREATE TABLE public.customer_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    address TEXT,
    region TEXT,
    contact_person TEXT,
    phone TEXT,
    tax_number TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_customer_locations_updated_at 
  BEFORE UPDATE ON public.customer_locations
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 3. Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to customers" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to customer_locations" ON public.customer_locations FOR ALL TO authenticated USING (true);
