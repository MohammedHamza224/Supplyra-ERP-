-- Migration 018: Fix product_suppliers permissions
-- Restores missing SELECT privileges that cause 403 (42501) on nested queries

-- 1. Ensure RLS is enabled
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

-- 2. Explicitly Grant Privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_suppliers TO authenticated;

-- 3. Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Product Suppliers View" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Insert" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Update" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Delete" ON public.product_suppliers;
DROP POLICY IF EXISTS "Allow authenticated full access to product_suppliers" ON public.product_suppliers;

-- 4. Recreate Policies
CREATE POLICY "Product Suppliers View" ON public.product_suppliers FOR SELECT TO authenticated USING (public.has_permission('suppliers.view'));
CREATE POLICY "Product Suppliers Insert" ON public.product_suppliers FOR INSERT TO authenticated WITH CHECK (public.has_permission('suppliers.create'));
CREATE POLICY "Product Suppliers Update" ON public.product_suppliers FOR UPDATE TO authenticated USING (public.has_permission('suppliers.update')) WITH CHECK (public.has_permission('suppliers.update'));
CREATE POLICY "Product Suppliers Delete" ON public.product_suppliers FOR DELETE TO authenticated USING (public.has_permission('suppliers.delete'));
