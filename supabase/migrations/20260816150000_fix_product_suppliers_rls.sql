-- Add missing grants to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.product_suppliers TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

-- The existing policies are:
-- Allow authenticated full access to product_suppliers (ALL)
-- Product Suppliers Delete
-- Product Suppliers Insert
-- Product Suppliers Update

-- We can drop the redundant ones if 'Allow authenticated full access' is meant to be the only one,
-- OR we can keep the granular ones and drop the 'ALL' one.
-- Let's drop the ALL one and make sure SELECT is also explicitly allowed for authenticated users.

DROP POLICY IF EXISTS "Allow authenticated full access to product_suppliers" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Delete" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Insert" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Update" ON public.product_suppliers;

-- Create clean policies based on permissions
CREATE POLICY "Product Suppliers Select" ON public.product_suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Product Suppliers Insert" ON public.product_suppliers
  FOR INSERT TO authenticated WITH CHECK (has_permission('products.create') OR has_permission('products.update'));

CREATE POLICY "Product Suppliers Update" ON public.product_suppliers
  FOR UPDATE TO authenticated USING (has_permission('products.update')) WITH CHECK (has_permission('products.update'));

CREATE POLICY "Product Suppliers Delete" ON public.product_suppliers
  FOR DELETE TO authenticated USING (has_permission('products.update') OR has_permission('products.delete'));
