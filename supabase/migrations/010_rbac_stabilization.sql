-- Migration 010: RBAC Stabilization and Secure Grants

-- =========================================================================
-- 1. GRANTS
-- Ensure only necessary privileges are given to authenticated users.
-- Lookup tables get SELECT only. Business tables get SELECT, INSERT, UPDATE.
-- =========================================================================

-- Products and Lookups
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.brands TO authenticated;
GRANT SELECT ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;

-- Suppliers
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_suppliers TO authenticated;

-- Customers
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_locations TO authenticated;

-- Warehouses
GRANT SELECT, INSERT, UPDATE ON public.warehouses TO authenticated;

-- =========================================================================
-- 2. DROP PERMISSIVE POLICIES
-- Clean up all 'USING (true)' policies from previous migrations.
-- =========================================================================

DROP POLICY IF EXISTS "Allow authenticated full access to products" ON public.products;
DROP POLICY IF EXISTS "Managers can update products" ON public.products; -- drop to replace cleanly
DROP POLICY IF EXISTS "Allow authenticated full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated full access to brands" ON public.brands;
DROP POLICY IF EXISTS "Allow authenticated full access to units" ON public.units;

DROP POLICY IF EXISTS "Allow authenticated full access to suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow authenticated full access to product_suppliers" ON public.product_suppliers;

DROP POLICY IF EXISTS "Allow authenticated full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated full access to customer_locations" ON public.customer_locations;

DROP POLICY IF EXISTS "Allow authenticated full access to warehouses" ON public.warehouses;

-- =========================================================================
-- 3. CREATE SECURE RBAC POLICIES
-- =========================================================================

-- LOOKUP TABLES (Read-only for all authenticated)
CREATE POLICY "Categories View" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Brands View" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Units View" ON public.units FOR SELECT TO authenticated USING (true);

-- PRODUCTS
CREATE POLICY "Products View" ON public.products FOR SELECT TO authenticated USING (public.has_permission('products.view'));
CREATE POLICY "Products Insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_permission('products.create'));
CREATE POLICY "Products Update" ON public.products FOR UPDATE TO authenticated USING (public.has_permission('products.update')) WITH CHECK (public.has_permission('products.update'));

-- SUPPLIERS
CREATE POLICY "Suppliers View" ON public.suppliers FOR SELECT TO authenticated USING (public.has_permission('suppliers.view'));
CREATE POLICY "Suppliers Insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_permission('suppliers.create'));
CREATE POLICY "Suppliers Update" ON public.suppliers FOR UPDATE TO authenticated USING (public.has_permission('suppliers.update')) WITH CHECK (public.has_permission('suppliers.update'));

CREATE POLICY "Product Suppliers View" ON public.product_suppliers FOR SELECT TO authenticated USING (public.has_permission('suppliers.view'));
CREATE POLICY "Product Suppliers Insert" ON public.product_suppliers FOR INSERT TO authenticated WITH CHECK (public.has_permission('suppliers.create'));
CREATE POLICY "Product Suppliers Update" ON public.product_suppliers FOR UPDATE TO authenticated USING (public.has_permission('suppliers.update')) WITH CHECK (public.has_permission('suppliers.update'));

-- CUSTOMERS
CREATE POLICY "Customers View" ON public.customers FOR SELECT TO authenticated USING (public.has_permission('customers.view'));
CREATE POLICY "Customers Insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_permission('customers.create'));
CREATE POLICY "Customers Update" ON public.customers FOR UPDATE TO authenticated USING (public.has_permission('customers.update')) WITH CHECK (public.has_permission('customers.update'));

CREATE POLICY "Customer Locations View" ON public.customer_locations FOR SELECT TO authenticated USING (public.has_permission('customers.view'));
CREATE POLICY "Customer Locations Insert" ON public.customer_locations FOR INSERT TO authenticated WITH CHECK (public.has_permission('customers.create'));
CREATE POLICY "Customer Locations Update" ON public.customer_locations FOR UPDATE TO authenticated USING (public.has_permission('customers.update')) WITH CHECK (public.has_permission('customers.update'));

-- WAREHOUSES
CREATE POLICY "Warehouses View" ON public.warehouses FOR SELECT TO authenticated USING (public.has_permission('warehouses.view'));
CREATE POLICY "Warehouses Insert" ON public.warehouses FOR INSERT TO authenticated WITH CHECK (public.has_permission('warehouses.create'));
CREATE POLICY "Warehouses Update" ON public.warehouses FOR UPDATE TO authenticated USING (public.has_permission('warehouses.update')) WITH CHECK (public.has_permission('warehouses.update'));
