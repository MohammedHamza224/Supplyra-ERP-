-- Migration 022: Fix product_suppliers insert policy

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Product Suppliers Insert" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Update" ON public.product_suppliers;
DROP POLICY IF EXISTS "Product Suppliers Delete" ON public.product_suppliers;

-- Recreate them with appropriate permissions for Product Management
-- Assigning a supplier to a product requires permission to manage products
CREATE POLICY "Product Suppliers Insert" ON public.product_suppliers 
FOR INSERT TO authenticated 
WITH CHECK (public.has_permission('products.create') OR public.has_permission('products.update'));

CREATE POLICY "Product Suppliers Update" ON public.product_suppliers 
FOR UPDATE TO authenticated 
USING (public.has_permission('products.update')) 
WITH CHECK (public.has_permission('products.update'));

CREATE POLICY "Product Suppliers Delete" ON public.product_suppliers 
FOR DELETE TO authenticated 
USING (public.has_permission('products.update') OR public.has_permission('products.delete'));
