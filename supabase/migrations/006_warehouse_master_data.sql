-- Migration 006: Warehouse Master Data

-- 1. Warehouses
CREATE TABLE public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW
  EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- Insert default main warehouse
INSERT INTO public.warehouses (code, name, location, notes) VALUES
    ('MAIN', 'Main Distribution Center', 'Headquarters', 'Primary storage facility');

-- 2. Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to warehouses" ON public.warehouses FOR ALL TO authenticated USING (true);
