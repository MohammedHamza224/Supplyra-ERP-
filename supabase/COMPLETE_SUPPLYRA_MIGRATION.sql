-- ==========================================
-- SUPPLYRA ERP: COMPLETE PRODUCTION DATABASE MIGRATION
-- Generates entire schema, functions, RLS, storage & seeds
-- ==========================================


-- >>>>>>>>>>>>>> MIGRATION: 001_extensions_and_core.sql <<<<<<<<<<<<<<
-- Migration 001: Extensions and Core Functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable moddatetime extension for automatic updated_at timestamp updates
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- Create standard updated_at trigger function if we don't want to rely solely on moddatetime
CREATE OR REPLACE FUNCTION set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- >>>>>>>>>>>>>> MIGRATION: 002_auth_and_roles.sql <<<<<<<<<<<<<<
-- Migration 002: Auth, Roles, and Permissions

-- 1. Roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger to roles using Migration 001 function
CREATE TRIGGER handle_roles_updated_at 
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- Insert default roles exactly as requested
INSERT INTO public.roles (name, description) VALUES
    ('Manager', 'Full system access'),
    ('Sales', 'Sales operations and customer management'),
    ('Warehouse', 'Inventory and warehouse operations'),
    ('Purchasing', 'Supplier and purchase order management');

-- 2. Permissions
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Role Permissions (Many-to-Many)
CREATE TABLE public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Profiles (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    role_id UUID REFERENCES public.roles(id), -- Nullable FK, do not assign privileged role automatically
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger to profiles using Migration 001 function
CREATE TRIGGER handle_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 5. Trigger to automatically create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile WITHOUT any privileged role automatically.
  -- role_id remains NULL. Managers must explicitly assign roles later.
  INSERT INTO public.profiles (id, first_name, last_name, role_id)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Security Trigger: Prevent users from updating restricted profile fields
CREATE OR REPLACE FUNCTION public.restrict_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce this restriction when a user is updating their OWN profile
  IF auth.uid() = OLD.id THEN
    -- Prevent role_id change
    IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
      RAISE EXCEPTION 'You are not allowed to change your own role.';
    END IF;
    
    -- Prevent ID change
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'You are not allowed to change your profile ID.';
    END IF;

    -- Prevent created_at change
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'You are not allowed to change your profile creation date.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.restrict_profile_updates();

-- 6. RLS Policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users minimum read access to function
CREATE POLICY "Allow authenticated to read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated to read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated to read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Allow users to read ONLY their own profile. Managers' broad access will be handled in a later RBAC phase.
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Allow users to update their own basic info. 
-- The restrict_profile_updates() trigger ensures they cannot update role_id, id, or created_at.
CREATE POLICY "Users can update own basic info" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- >>>>>>>>>>>>>> MIGRATION: 003_product_master_data.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 004_supplier_master_data.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 005_customer_master_data.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 006_warehouse_master_data.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 007_rbac_and_user_management.sql <<<<<<<<<<<<<<
-- Phase 1: RBAC and User Management

-- 1. Add 'active' column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- 2. Prevent normal users from updating privileged fields
CREATE OR REPLACE FUNCTION public.restrict_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (auth.uid() = NEW.id) THEN
    -- Users can update themselves, but cannot change their role_id or active status
    IF (OLD.role_id IS DISTINCT FROM NEW.role_id) OR (OLD.active IS DISTINCT FROM NEW.active) THEN
      RAISE EXCEPTION 'Not authorized to change role or active status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restrict_profile_updates_trigger ON public.profiles;
CREATE TRIGGER restrict_profile_updates_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.restrict_profile_updates();

-- 3. Insert 23 Phase 1 permissions
INSERT INTO public.permissions (name, description) VALUES 
  ('users.view', 'View user list and details'),
  ('users.create', 'Invite or create new users'),
  ('users.update', 'Update user profiles'),
  ('users.activate', 'Activate or deactivate users'),
  ('users.assign_role', 'Assign roles to users'),
  ('roles.view', 'View roles'),
  ('permissions.view', 'View permissions'),
  ('products.view', 'View products'),
  ('products.create', 'Create products'),
  ('products.update', 'Update products'),
  ('products.delete', 'Delete products'),
  ('suppliers.view', 'View suppliers'),
  ('suppliers.create', 'Create suppliers'),
  ('suppliers.update', 'Update suppliers'),
  ('suppliers.delete', 'Delete suppliers'),
  ('customers.view', 'View customers'),
  ('customers.create', 'Create customers'),
  ('customers.update', 'Update customers'),
  ('customers.delete', 'Delete customers'),
  ('warehouses.view', 'View warehouses'),
  ('warehouses.create', 'Create warehouses'),
  ('warehouses.update', 'Update warehouses'),
  ('warehouses.delete', 'Delete warehouses')
ON CONFLICT (name) DO NOTHING;

-- 4. Role-permission mappings (Assign all permissions to Manager)
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- 5. has_permission()
CREATE OR REPLACE FUNCTION public.has_permission(required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role_id UUID;
  v_has_permission BOOLEAN;
BEGIN
  SELECT role_id INTO v_role_id FROM public.profiles WHERE id = auth.uid();
  IF v_role_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = v_role_id AND p.name = required_permission
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. get_my_permissions()
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS JSONB AS $$
DECLARE
  v_role_id UUID;
  v_permissions JSONB;
BEGIN
  SELECT role_id INTO v_role_id FROM public.profiles WHERE id = auth.uid();
  IF v_role_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  SELECT COALESCE(jsonb_agg(p.name), '[]'::JSONB) INTO v_permissions
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE rp.role_id = v_role_id;

  RETURN v_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. get_my_role()
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT r.name INTO v_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();
  
  RETURN v_role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Phase 1 RLS policies
-- Profiles
CREATE POLICY "Managers can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_permission('users.view'));
CREATE POLICY "Managers can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_permission('users.update'));
-- Roles
CREATE POLICY "Managers can view roles" ON public.roles FOR SELECT TO authenticated USING (public.has_permission('roles.view'));
-- Permissions
CREATE POLICY "Managers can view permissions" ON public.permissions FOR SELECT TO authenticated USING (public.has_permission('permissions.view'));
-- Role Permissions
CREATE POLICY "Managers can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (public.has_permission('roles.view'));

-- 9. get_users_with_email() (Secure RPC for Managers to view users email)
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  first_name TEXT,
  last_name TEXT,
  role_id UUID,
  active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.has_permission('users.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    p.first_name,
    p.last_name,
    p.role_id,
    p.active,
    p.created_at
  FROM auth.users au
  JOIN public.profiles p ON au.id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. First-user Manager bootstrap logic
DO $$
DECLARE
  v_manager_role_id UUID;
  v_first_user_id UUID;
BEGIN
  -- Bootstrap the FIRST user as Manager
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  SELECT id INTO v_first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF v_first_user_id IS NOT NULL AND v_manager_role_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET role_id = v_manager_role_id 
    WHERE id = v_first_user_id AND (role_id IS NULL OR role_id != v_manager_role_id);
  END IF;
END $$;

-- >>>>>>>>>>>>>> MIGRATION: 008_bootstrap_first_manager.sql <<<<<<<<<<<<<<
-- Migration 008: Bootstrap first user as Manager
-- Fixes the Phase 1 integration issue where the initial user has no role assigned.
DO $$
DECLARE
  v_user_count INT;
  v_manager_role_id UUID;
  v_first_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- We ONLY bootstrap if there is exactly 1 user (the initial admin)
  IF v_user_count = 1 THEN
    SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
    SELECT id INTO v_first_user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
    
    IF v_first_user_id IS NOT NULL AND v_manager_role_id IS NOT NULL THEN
      UPDATE public.profiles SET role_id = v_manager_role_id WHERE id = v_first_user_id AND role_id IS NULL;
    END IF;
  END IF;
END;
$$;


-- >>>>>>>>>>>>>> MIGRATION: 009_repair_missing_profiles.sql <<<<<<<<<<<<<<
-- Migration 009: Repair missing profiles and bootstrap Manager
DO $$
DECLARE
  v_manager_role_id UUID;
  v_first_user_id UUID;
BEGIN
  -- 1. Repair missing profiles
  -- Insert a profile for any auth.users that don't have one in public.profiles
  -- This handles users created before the trigger was attached or if the trigger failed.
  INSERT INTO public.profiles (id, first_name, last_name, role_id)
  SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'first_name', 'System'),
    COALESCE(u.raw_user_meta_data->>'last_name', 'Admin'),
    NULL
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;

  -- 2. Bootstrap the FIRST user as Manager
  -- Get the Manager role ID
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  
  -- Find the oldest user in auth.users (the account creator/owner)
  SELECT id INTO v_first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  -- Assign Manager role ONLY to the first user
  IF v_first_user_id IS NOT NULL AND v_manager_role_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET role_id = v_manager_role_id 
    WHERE id = v_first_user_id AND (role_id IS NULL OR role_id != v_manager_role_id);
  END IF;

END;
$$;


-- >>>>>>>>>>>>>> MIGRATION: 010_rbac_stabilization.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 011_customer_payment_constraint_fix.sql <<<<<<<<<<<<<<
-- Migration 011: Customer Payment Constraint Fix

-- Drop the old constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass
      AND pg_get_constraintdef(oid) LIKE '%payment_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.customers DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Create the new constraint safely
ALTER TABLE public.customers
  ADD CONSTRAINT customers_payment_type_check 
  CHECK (
    payment_type = ANY (
      ARRAY[
        'Cash'::text,
        'Credit'::text,
        'Partial'::text,
        'Card'::text,
        'Bank Transfer'::text,
        'Wallet'::text
      ]
    )
  );

-- Update default
ALTER TABLE public.customers ALTER COLUMN payment_type SET DEFAULT 'Cash';


-- >>>>>>>>>>>>>> MIGRATION: 012_inventory_batches.sql <<<<<<<<<<<<<<
-- Migration 012: Inventory Batches and Expiry Management

-- 1. Create the inventory_batches table
CREATE TABLE public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    production_date DATE,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(product_id, warehouse_id, batch_number)
);

-- Update timestamp trigger
CREATE TRIGGER handle_inventory_batches_updated_at 
  BEFORE UPDATE ON public.inventory_batches
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to inventory_batches" 
ON public.inventory_batches FOR ALL TO authenticated USING (true);


-- 2. View for Inventory with Expiry Status Calculation
CREATE OR REPLACE VIEW public.inventory_batches_view AS
SELECT 
    b.*,
    p.name AS product_name,
    p.product_code AS product_code,
    c.name AS category_name,
    w.name AS warehouse_name,
    CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN b.expiry_date = CURRENT_DATE THEN 'Expires Today'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS expiry_status
FROM 
    public.inventory_batches b
JOIN public.products p ON b.product_id = p.id
JOIN public.warehouses w ON b.warehouse_id = w.id
LEFT JOIN public.categories c ON p.category_id = c.id;


-- 3. FEFO Stock Deduction Function (For future use)
-- This function deduces stock safely, starting with the earliest expiry_date.
CREATE OR REPLACE FUNCTION deduct_stock_fefo(
    p_product_id UUID, 
    p_warehouse_id UUID, 
    p_quantity NUMERIC
) 
RETURNS TABLE (
    batch_id UUID,
    deducted_qty NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining NUMERIC := p_quantity;
    v_batch RECORD;
    v_deduct NUMERIC;
BEGIN
    -- Ensure we don't deduct more than total available valid stock
    IF (SELECT COALESCE(SUM(quantity), 0) 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND active = true 
          AND expiry_date >= CURRENT_DATE) < p_quantity THEN
        RAISE EXCEPTION 'Insufficient valid stock available in warehouse';
    END IF;

    -- Create temporary table to track deductions
    CREATE TEMP TABLE IF NOT EXISTS temp_deductions (
        b_id UUID,
        d_qty NUMERIC
    ) ON COMMIT DROP;
    
    TRUNCATE temp_deductions;

    -- Iterate through valid batches sorted by expiry date ascending (FEFO)
    FOR v_batch IN 
        SELECT id, quantity 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND active = true 
          AND expiry_date >= CURRENT_DATE 
          AND quantity > 0
        ORDER BY expiry_date ASC, created_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;

        IF v_batch.quantity >= v_remaining THEN
            v_deduct := v_remaining;
        ELSE
            v_deduct := v_batch.quantity;
        END IF;

        -- Update batch quantity
        UPDATE public.inventory_batches 
        SET quantity = quantity - v_deduct 
        WHERE id = v_batch.id;

        -- Record deduction
        INSERT INTO temp_deductions (b_id, d_qty) VALUES (v_batch.id, v_deduct);

        v_remaining := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'Failed to deduct full quantity due to concurrency issue';
    END IF;

    RETURN QUERY SELECT b_id, d_qty FROM temp_deductions;
END;
$$;


-- >>>>>>>>>>>>>> MIGRATION: 013_product_suppliers_purchase_price.sql <<<<<<<<<<<<<<
-- Migration 013: Add purchase_price to product_suppliers

ALTER TABLE public.product_suppliers 
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) CHECK (purchase_price >= 0);


-- >>>>>>>>>>>>>> MIGRATION: 014_warehouses_users_stabilization.sql <<<<<<<<<<<<<<
-- Migration 014: Warehouses and Users RBAC Stabilization

-- =========================================================================
-- 1. WAREHOUSES STABILIZATION
-- =========================================================================

-- Grant necessary privileges
GRANT SELECT, INSERT, UPDATE ON public.warehouses TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to prevent duplicates
DROP POLICY IF EXISTS "Allow authenticated full access to warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouses View" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouses Insert" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouses Update" ON public.warehouses;

-- Create secure RBAC policies for warehouses
CREATE POLICY "Warehouses View" ON public.warehouses 
    FOR SELECT TO authenticated 
    USING (public.has_permission('warehouses.view'));

CREATE POLICY "Warehouses Insert" ON public.warehouses 
    FOR INSERT TO authenticated 
    WITH CHECK (public.has_permission('warehouses.create'));

CREATE POLICY "Warehouses Update" ON public.warehouses 
    FOR UPDATE TO authenticated 
    USING (public.has_permission('warehouses.update')) 
    WITH CHECK (public.has_permission('warehouses.update'));


-- =========================================================================
-- 2. USERS (PROFILES & RBAC TABLES) STABILIZATION
-- =========================================================================

-- Grant necessary privileges
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.profiles;

-- Profile Policies
CREATE POLICY "Users can read own profile" ON public.profiles 
    FOR SELECT TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own basic info" ON public.profiles 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Managers can view all profiles" ON public.profiles 
    FOR SELECT TO authenticated 
    USING (public.has_permission('users.view'));

CREATE POLICY "Managers can update all profiles" ON public.profiles 
    FOR UPDATE TO authenticated 
    USING (public.has_permission('users.update') OR public.has_permission('users.activate') OR public.has_permission('users.assign_role'))
    WITH CHECK (public.has_permission('users.update') OR public.has_permission('users.activate') OR public.has_permission('users.assign_role'));


-- Roles Policies
DROP POLICY IF EXISTS "Managers can view roles" ON public.roles;
DROP POLICY IF EXISTS "Allow authenticated to read roles" ON public.roles;

CREATE POLICY "Allow authenticated to read roles" ON public.roles 
    FOR SELECT TO authenticated 
    USING (true);


-- Permissions Policies
DROP POLICY IF EXISTS "Managers can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Allow authenticated to read permissions" ON public.permissions;

CREATE POLICY "Allow authenticated to read permissions" ON public.permissions 
    FOR SELECT TO authenticated 
    USING (true);


-- Role Permissions Policies
DROP POLICY IF EXISTS "Managers can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Allow authenticated to read role_permissions" ON public.role_permissions;

CREATE POLICY "Allow authenticated to read role_permissions" ON public.role_permissions 
    FOR SELECT TO authenticated 
    USING (true);

-- =========================================================================
-- 3. TRIGGER SAFETY: PREVENT UNAUTHORIZED PRIVILEGE ESCALATION
-- =========================================================================

CREATE OR REPLACE FUNCTION public.restrict_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (auth.uid() = NEW.id) THEN
    -- A user is updating themselves. They cannot change their role_id or active status
    IF (OLD.role_id IS DISTINCT FROM NEW.role_id) OR (OLD.active IS DISTINCT FROM NEW.active) THEN
      RAISE EXCEPTION 'Not authorized to change role or active status';
    END IF;
  ELSE
    -- Someone else is updating this profile. They must have appropriate RBAC permissions.
    IF (OLD.role_id IS DISTINCT FROM NEW.role_id) AND NOT public.has_permission('users.assign_role') THEN
        RAISE EXCEPTION 'Not authorized to assign roles';
    END IF;
    
    IF (OLD.active IS DISTINCT FROM NEW.active) AND NOT public.has_permission('users.activate') THEN
        RAISE EXCEPTION 'Not authorized to activate/deactivate users';
    END IF;

    -- If any other field is changing, they must have users.update
    IF (OLD.first_name IS DISTINCT FROM NEW.first_name OR OLD.last_name IS DISTINCT FROM NEW.last_name OR OLD.phone IS DISTINCT FROM NEW.phone) AND NOT public.has_permission('users.update') THEN
        RAISE EXCEPTION 'Not authorized to update other profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 3.5 ADD DEACTIVATE PERMISSION
-- =========================================================================
INSERT INTO public.permissions (name, description) VALUES 
  ('warehouses.deactivate', 'Activate or deactivate warehouses')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions WHERE name = 'warehouses.deactivate'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- =========================================================================
-- 4. GRANTS FOR RPC FUNCTIONS
-- =========================================================================

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;


-- >>>>>>>>>>>>>> MIGRATION: 015_users_email_rpc.sql <<<<<<<<<<<<<<
-- Migration 015: Users Email RPC

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  first_name TEXT,
  last_name TEXT,
  role_id UUID,
  active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RBAC Security Guard: Ensure the executing user has the 'users.view' permission
  IF NOT public.has_permission('users.view') THEN
    RAISE EXCEPTION 'Access denied. Missing users.view permission.';
  END IF;

  -- Return only the safe, required fields
  RETURN QUERY
  SELECT 
    au.id,
    au.email::VARCHAR,
    p.first_name,
    p.last_name,
    p.role_id,
    p.active,
    p.created_at
  FROM 
    auth.users au
  JOIN 
    public.profiles p ON au.id = p.id;
END;
$$;

-- Grant EXECUTE permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;


-- >>>>>>>>>>>>>> MIGRATION: 016_service_role_profiles_grant.sql <<<<<<<<<<<<<<
-- Migration 016: Grant service_role privileges on profiles

-- Ensure the service_role has necessary privileges to update profiles during user creation
-- via the trusted Edge Function. This does NOT grant privileges to authenticated or anon.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;


-- >>>>>>>>>>>>>> MIGRATION: 017_update_handle_new_user.sql <<<<<<<<<<<<<<
-- Migration 017: Update handle_new_user to read role_id from metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile, extracting role_id from user_metadata if provided
  -- This prevents race conditions where the Edge Function update fails to match the row
  INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(NEW.raw_user_meta_data->>'role_id', '')::uuid,
    COALESCE((NEW.raw_user_meta_data->>'active')::boolean, true)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>>>>>>>>>>>>> MIGRATION: 018_fix_product_suppliers_permissions.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 019_purchases_module.sql <<<<<<<<<<<<<<
-- Migration 019: Purchases Module

-- 1. Create purchases table
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    notes TEXT,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Create purchase_items table
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    purchase_price NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    batch_number TEXT,
    production_date DATE,
    expiry_date DATE,
    received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0 AND received_quantity <= quantity),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Triggers for updated_at
CREATE TRIGGER handle_purchases_updated_at 
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

CREATE TRIGGER handle_purchase_items_updated_at 
  BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 4. Auto-generate Purchase Number
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_seq INT;
BEGIN
    year_prefix := 'PO-' || to_char(CURRENT_DATE, 'YYYY') || '-';
    
    -- Lock table for concurrent safety
    LOCK TABLE public.purchases IN EXCLUSIVE MODE;
    
    SELECT COALESCE(MAX(SUBSTRING(purchase_number FROM LENGTH(year_prefix) + 1)::INT), 0) + 1
    INTO next_seq
    FROM public.purchases
    WHERE purchase_number LIKE year_prefix || '%';
    
    NEW.purchase_number := year_prefix || LPAD(next_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_purchase_number
  BEFORE INSERT ON public.purchases
  FOR EACH ROW
  WHEN (NEW.purchase_number IS NULL OR NEW.purchase_number = '')
  EXECUTE PROCEDURE generate_purchase_number();

-- 5. RPC Functions for Receive and Cancel
CREATE OR REPLACE FUNCTION receive_purchase(p_purchase_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_warehouse_id UUID;
    v_item RECORD;
BEGIN
    -- Get purchase details
    SELECT status, warehouse_id INTO v_status, v_warehouse_id
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE; -- Lock row

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;

    IF v_status = 'RECEIVED' THEN
        RAISE EXCEPTION 'Purchase is already received';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot receive a cancelled purchase';
    END IF;

    -- Update purchase status
    UPDATE public.purchases
    SET status = 'RECEIVED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_purchase_id;

    -- Process each item and insert into inventory_batches
    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id LOOP
        -- For full receive in this phase, received_quantity = quantity
        UPDATE public.purchase_items
        SET received_quantity = quantity,
            updated_at = NOW()
        WHERE id = v_item.id;

        -- Insert or Update batch
        INSERT INTO public.inventory_batches (
            product_id,
            warehouse_id,
            batch_number,
            production_date,
            expiry_date,
            quantity,
            created_by
        ) VALUES (
            v_item.product_id,
            v_warehouse_id,
            COALESCE(v_item.batch_number, 'BATCH-' || to_char(NOW(), 'YYYYMMDD')),
            v_item.production_date,
            COALESCE(v_item.expiry_date, CURRENT_DATE + INTERVAL '365 days'), -- fallback
            v_item.quantity,
            p_user_id
        )
        ON CONFLICT (product_id, warehouse_id, batch_number)
        DO UPDATE SET 
            quantity = public.inventory_batches.quantity + EXCLUDED.quantity,
            updated_at = NOW();
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cancel_purchase(p_purchase_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_warehouse_id UUID;
    v_item RECORD;
BEGIN
    SELECT status, warehouse_id INTO v_status, v_warehouse_id
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Purchase is already cancelled';
    END IF;

    -- Revert inventory if it was received
    IF v_status = 'RECEIVED' OR v_status = 'PARTIALLY_RECEIVED' THEN
        FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id AND received_quantity > 0 LOOP
            -- Decrease batch quantity
            UPDATE public.inventory_batches
            SET quantity = quantity - v_item.received_quantity,
                updated_at = NOW()
            WHERE product_id = v_item.product_id 
              AND warehouse_id = v_warehouse_id 
              AND batch_number = COALESCE(v_item.batch_number, 'BATCH-' || to_char(NOW(), 'YYYYMMDD'));
              
            -- Reset received quantity
            UPDATE public.purchase_items
            SET received_quantity = 0,
                updated_at = NOW()
            WHERE id = v_item.id;
        END LOOP;
    END IF;

    UPDATE public.purchases
    SET status = 'CANCELLED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_purchase_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Insert Permissions
INSERT INTO public.permissions (name, description) VALUES 
  ('purchases.view', 'View purchases'),
  ('purchases.create', 'Create purchases'),
  ('purchases.update', 'Update purchases'),
  ('purchases.receive', 'Receive purchases'),
  ('purchases.cancel', 'Cancel purchases')
ON CONFLICT DO NOTHING;

-- Grant to Manager Role (Assuming Manager has role_id dynamically found or we just grant to role_id where name='Manager')
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager' LIMIT 1;
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions 
    WHERE name LIKE 'purchases.%'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 7. Enable RLS & Policies
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;

-- Purchases Policies
CREATE POLICY "Purchases View" ON public.purchases FOR SELECT TO authenticated USING (public.has_permission('purchases.view'));
CREATE POLICY "Purchases Insert" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.has_permission('purchases.create'));
CREATE POLICY "Purchases Update" ON public.purchases FOR UPDATE TO authenticated USING (public.has_permission('purchases.update')) WITH CHECK (public.has_permission('purchases.update'));
CREATE POLICY "Purchases Delete" ON public.purchases FOR DELETE TO authenticated USING (public.has_permission('purchases.cancel'));

-- Purchase Items Policies
CREATE POLICY "Purchase Items View" ON public.purchase_items FOR SELECT TO authenticated USING (public.has_permission('purchases.view'));
CREATE POLICY "Purchase Items Insert" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (public.has_permission('purchases.create'));
CREATE POLICY "Purchase Items Update" ON public.purchase_items FOR UPDATE TO authenticated USING (public.has_permission('purchases.update')) WITH CHECK (public.has_permission('purchases.update'));
CREATE POLICY "Purchase Items Delete" ON public.purchase_items FOR DELETE TO authenticated USING (public.has_permission('purchases.cancel'));


-- >>>>>>>>>>>>>> MIGRATION: 020_sales_module.sql <<<<<<<<<<<<<<
-- Migration 020: Sales Module

-- 0. Ensure inventory_batches and deduct_stock_fefo exist in case the remote DB lost them
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    production_date DATE,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(product_id, warehouse_id, batch_number)
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_inventory_batches_updated_at') THEN
        CREATE TRIGGER handle_inventory_batches_updated_at 
        BEFORE UPDATE ON public.inventory_batches
        FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();
    END IF;
END $$;

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'inventory_batches' AND policyname = 'Allow authenticated full access to inventory_batches'
    ) THEN
        CREATE POLICY "Allow authenticated full access to inventory_batches" 
        ON public.inventory_batches FOR ALL TO authenticated USING (true);
    END IF;
END $$;

CREATE OR REPLACE VIEW public.inventory_batches_view AS
SELECT 
    b.*,
    p.name AS product_name,
    p.product_code AS product_code,
    c.name AS category_name,
    w.name AS warehouse_name,
    CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN b.expiry_date = CURRENT_DATE THEN 'Expires Today'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS expiry_status
FROM 
    public.inventory_batches b
JOIN public.products p ON b.product_id = p.id
JOIN public.warehouses w ON b.warehouse_id = w.id
LEFT JOIN public.categories c ON p.category_id = c.id;

CREATE OR REPLACE FUNCTION deduct_stock_fefo(
    p_product_id UUID, 
    p_warehouse_id UUID, 
    p_quantity NUMERIC
) 
RETURNS TABLE (
    batch_id UUID,
    deducted_qty NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining NUMERIC := p_quantity;
    v_batch RECORD;
    v_deduct NUMERIC;
BEGIN
    IF (SELECT COALESCE(SUM(quantity), 0) 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND active = true 
          AND expiry_date >= CURRENT_DATE) < p_quantity THEN
        RAISE EXCEPTION 'Insufficient valid stock available in warehouse';
    END IF;

    CREATE TEMP TABLE IF NOT EXISTS temp_deductions (
        b_id UUID,
        d_qty NUMERIC
    ) ON COMMIT DROP;
    
    TRUNCATE temp_deductions;

    FOR v_batch IN 
        SELECT id, quantity 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND active = true 
          AND expiry_date >= CURRENT_DATE 
          AND quantity > 0
        ORDER BY expiry_date ASC, created_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;

        IF v_batch.quantity >= v_remaining THEN
            v_deduct := v_remaining;
        ELSE
            v_deduct := v_batch.quantity;
        END IF;

        UPDATE public.inventory_batches 
        SET quantity = quantity - v_deduct 
        WHERE id = v_batch.id;

        INSERT INTO temp_deductions (b_id, d_qty) VALUES (v_batch.id, v_deduct);

        v_remaining := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'Failed to deduct full quantity due to concurrency issue';
    END IF;

    RETURN QUERY SELECT b_id, d_qty FROM temp_deductions;
END;
$$;


-- 1. Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED')),
    notes TEXT,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Create order_items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create order_item_batches table (Ledger for exactly which batches were consumed)
CREATE TABLE public.order_item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'BANK', 'WALLET')),
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Triggers for updated_at
CREATE TRIGGER handle_orders_updated_at 
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

CREATE TRIGGER handle_order_items_updated_at 
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 6. Auto-generate Order Number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_seq INT;
BEGIN
    year_prefix := 'SO-' || to_char(CURRENT_DATE, 'YYYY') || '-';
    
    LOCK TABLE public.orders IN EXCLUSIVE MODE;
    
    SELECT COALESCE(MAX(SUBSTRING(order_number FROM LENGTH(year_prefix) + 1)::INT), 0) + 1
    INTO next_seq
    FROM public.orders
    WHERE order_number LIKE year_prefix || '%';
    
    NEW.order_number := year_prefix || LPAD(next_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE PROCEDURE generate_order_number();


-- 7. RPC Functions for Confirm and Cancel Sales

CREATE OR REPLACE FUNCTION confirm_sale(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_warehouse_id UUID;
    v_item RECORD;
    v_batch RECORD;
BEGIN
    SELECT status, warehouse_id INTO v_status, v_warehouse_id
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_status != 'PENDING' THEN
        RAISE EXCEPTION 'Order is already %', v_status;
    END IF;

    FOR v_item IN SELECT id, product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
        FOR v_batch IN SELECT batch_id, deducted_qty FROM deduct_stock_fefo(v_item.product_id, v_warehouse_id, v_item.quantity) LOOP
            INSERT INTO public.order_item_batches (order_item_id, batch_id, quantity)
            VALUES (v_item.id, v_batch.batch_id, v_batch.deducted_qty);
        END LOOP;
    END LOOP;

    UPDATE public.orders
    SET 
        status = 'CONFIRMED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_order_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION cancel_sale(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_batch_record RECORD;
BEGIN
    SELECT status INTO v_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Order is already cancelled';
    END IF;

    IF v_status IN ('CONFIRMED', 'PREPARING', 'READY', 'COMPLETED') THEN
        FOR v_batch_record IN 
            SELECT oib.batch_id, SUM(oib.quantity) as restore_qty
            FROM public.order_item_batches oib
            JOIN public.order_items oi ON oib.order_item_id = oi.id
            WHERE oi.order_id = p_order_id
            GROUP BY oib.batch_id
        LOOP
            UPDATE public.inventory_batches
            SET quantity = quantity + v_batch_record.restore_qty
            WHERE id = v_batch_record.batch_id;
        END LOOP;
    END IF;

    UPDATE public.orders
    SET 
        status = 'CANCELLED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_order_id;
    
    UPDATE public.payments
    SET status = 'REFUNDED'
    WHERE order_id = p_order_id AND status = 'COMPLETED';

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Add Permissions
INSERT INTO public.permissions (name, description) VALUES
    ('sales.view', 'View Sales'),
    ('sales.create', 'Create Sales'),
    ('sales.update', 'Update Sales'),
    ('sales.cancel', 'Cancel Sales'),
    ('sales.receive_payment', 'Receive Payments')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager'
  AND p.name IN ('sales.view', 'sales.create', 'sales.update', 'sales.cancel', 'sales.receive_payment')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 9. RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders" ON public.orders FOR SELECT TO authenticated USING (has_permission('sales.view'));
CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT TO authenticated USING (has_permission('sales.view'));
CREATE POLICY "Users can view order item batches" ON public.order_item_batches FOR SELECT TO authenticated USING (has_permission('sales.view'));
CREATE POLICY "Users can view payments" ON public.payments FOR SELECT TO authenticated USING (has_permission('sales.view'));

CREATE POLICY "Users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (has_permission('sales.create'));
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (has_permission('sales.create'));
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (has_permission('sales.receive_payment'));

CREATE POLICY "Users can update orders" ON public.orders FOR UPDATE TO authenticated USING (has_permission('sales.update')) WITH CHECK (has_permission('sales.update'));
CREATE POLICY "Users can update payments" ON public.payments FOR UPDATE TO authenticated USING (has_permission('sales.receive_payment')) WITH CHECK (has_permission('sales.receive_payment'));


-- >>>>>>>>>>>>>> MIGRATION: 021_fix_sales_grants.sql <<<<<<<<<<<<<<
-- Migration 021: Fix Sales Grants

-- Grant necessary privileges to authenticated users for Sales tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_item_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- Also grant execute on the RPC functions if missing
GRANT EXECUTE ON FUNCTION public.confirm_sale(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, UUID) TO authenticated;


-- >>>>>>>>>>>>>> MIGRATION: 022_fix_product_suppliers_insert.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 023_sales_discount_approvals.sql <<<<<<<<<<<<<<
-- Migration 023: Sales Discount Approvals Workflow

-- 1. Add new permission
INSERT INTO public.permissions (name, description) VALUES
    ('sales.discount.approve', 'Approve discounts over 5%')
ON CONFLICT (name) DO NOTHING;

-- Grant to Admin and Manager roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'Manager')
  AND p.name = 'sales.discount.approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. Add approval status to orders
ALTER TABLE public.orders 
ADD COLUMN discount_approval_status TEXT NOT NULL DEFAULT 'NONE' 
CHECK (discount_approval_status IN ('NONE', 'PENDING', 'APPROVED', 'REJECTED'));

-- 3. Create discount_approvals table
CREATE TABLE public.discount_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discount_percentage NUMERIC(5,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- Protect audit trail
ALTER TABLE public.discount_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View discount approvals" ON public.discount_approvals
    FOR SELECT TO authenticated
    USING (public.has_permission('sales.view'));

CREATE POLICY "Insert discount approvals" ON public.discount_approvals
    FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('sales.create') AND requested_by = auth.uid());

CREATE POLICY "Update discount approvals" ON public.discount_approvals
    FOR UPDATE TO authenticated
    USING (public.has_permission('sales.discount.approve') OR requested_by = auth.uid())
    WITH CHECK (
        public.has_permission('sales.discount.approve') OR 
        (requested_by = auth.uid() AND status = 'PENDING')
    );

GRANT SELECT, INSERT, UPDATE ON public.discount_approvals TO authenticated;

-- 4. Secure RPC Functions for Approval / Rejection
CREATE OR REPLACE FUNCTION public.approve_discount(
    p_approval_id UUID
) RETURNS VOID AS $$
DECLARE
    v_approval RECORD;
    v_order_status TEXT;
BEGIN
    -- Check permissions
    IF NOT public.has_permission('sales.discount.approve') THEN
        RAISE EXCEPTION 'Permission denied. Requires sales.discount.approve.';
    END IF;

    -- Get approval record
    SELECT * INTO v_approval FROM public.discount_approvals WHERE id = p_approval_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found.';
    END IF;

    IF v_approval.status != 'PENDING' THEN
        RAISE EXCEPTION 'Approval request is not in PENDING state.';
    END IF;

    -- Enforce: requester != approver
    IF v_approval.requested_by = auth.uid() THEN
        RAISE EXCEPTION 'You cannot approve your own discount request.';
    END IF;

    -- Approve
    UPDATE public.discount_approvals
    SET status = 'APPROVED',
        approved_by = auth.uid(),
        approved_at = NOW()
    WHERE id = p_approval_id;

    UPDATE public.orders
    SET discount_approval_status = 'APPROVED'
    WHERE id = v_approval.order_id;

    -- Now confirm the sale since the discount is approved
    -- We assume the order was saved but not confirmed.
    -- Calling the existing confirm_sale function if the order is still PENDING.
    SELECT status INTO v_order_status FROM public.orders WHERE id = v_approval.order_id;
    IF v_order_status = 'PENDING' THEN
        PERFORM public.confirm_sale(v_approval.order_id, auth.uid());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.approve_discount(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_discount(
    p_approval_id UUID,
    p_rejection_reason TEXT
) RETURNS VOID AS $$
DECLARE
    v_approval RECORD;
BEGIN
    -- Check permissions
    IF NOT public.has_permission('sales.discount.approve') THEN
        RAISE EXCEPTION 'Permission denied. Requires sales.discount.approve.';
    END IF;

    -- Get approval record
    SELECT * INTO v_approval FROM public.discount_approvals WHERE id = p_approval_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found.';
    END IF;

    IF v_approval.status != 'PENDING' THEN
        RAISE EXCEPTION 'Approval request is not in PENDING state.';
    END IF;

    -- Enforce: requester != approver (Optional for rejection, but good practice)
    IF v_approval.requested_by = auth.uid() THEN
        RAISE EXCEPTION 'You cannot reject your own discount request.';
    END IF;

    IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
        RAISE EXCEPTION 'Rejection reason is required.';
    END IF;

    -- Reject
    UPDATE public.discount_approvals
    SET status = 'REJECTED',
        approved_by = auth.uid(),
        approved_at = NOW(),
        rejection_reason = p_rejection_reason
    WHERE id = p_approval_id;

    UPDATE public.orders
    SET discount_approval_status = 'REJECTED'
    WHERE id = v_approval.order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_discount(UUID, TEXT) TO authenticated;

-- 5. Trigger to invalidate old approvals on edit (Rule 16)
CREATE OR REPLACE FUNCTION public.invalidate_discount_approval_on_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if discount or subtotal has changed
    IF NEW.discount != OLD.discount OR NEW.subtotal != OLD.subtotal THEN
        -- If old status was PENDING or APPROVED, we might need to invalidate
        IF OLD.discount_approval_status IN ('PENDING', 'APPROVED') THEN
            -- Is new discount > 5%?
            IF NEW.subtotal > 0 AND (NEW.discount / NEW.subtotal) > 0.05 THEN
                NEW.discount_approval_status := 'PENDING';
                -- Optionally, we could automatically cancel the old PENDING approval record here,
                -- but frontend should create a new one anyway.
            ELSE
                NEW.discount_approval_status := 'NONE';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_discount_approval
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_discount_approval_on_edit();


-- >>>>>>>>>>>>>> MIGRATION: 024_storage_buckets.sql <<<<<<<<<<<<<<
-- 024_storage_buckets.sql: Supabase Storage Configuration & RLS Policies for Supplyra
-- Buckets: 'public-assets' (Logos, User Avatars, Brand Images) & 'documents' (Invoices, Attachments)

-- 1. Create or update buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('public-assets', 'public-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS Policies for 'public-assets'
DROP POLICY IF EXISTS "Public Assets are viewable by everyone" ON storage.objects;
CREATE POLICY "Public Assets are viewable by everyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload public assets" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "Users can update their own public assets" ON storage.objects;
CREATE POLICY "Users can update their own public assets" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'public-assets' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own public assets" ON storage.objects;
CREATE POLICY "Users can delete their own public assets" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'public-assets' AND auth.uid() = owner);

-- 3. RLS Policies for 'documents'
DROP POLICY IF EXISTS "Authenticated users can view business documents" ON storage.objects;
CREATE POLICY "Authenticated users can view business documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can upload business documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload business documents" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Document owners or managers can delete documents" ON storage.objects;
CREATE POLICY "Document owners or managers can delete documents" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'documents' AND (auth.uid() = owner OR public.has_permission('settings.edit')));


-- >>>>>>>>>>>>>> MIGRATION: 20260816150000_fix_product_suppliers_rls.sql <<<<<<<<<<<<<<
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


-- >>>>>>>>>>>>>> MIGRATION: 20260817011500_fix_rbac_and_inventory.sql <<<<<<<<<<<<<<
-- 1. Fix inventory_batches Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_batches TO authenticated;

-- 2. Ensure Sales Role has appropriate permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Sales'
AND p.name IN (
  'sales.view',
  'sales.create',
  'sales.update',
  'sales.cancel',
  'sales.receive_payment',
  'customers.view',
  'customers.create',
  'customers.update',
  'products.view',
  'warehouses.view'
)
ON CONFLICT DO NOTHING;

-- 3. Ensure Warehouse Role has appropriate permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Warehouse'
AND p.name IN (
  'products.view',
  'warehouses.create',
  'warehouses.deactivate',
  'warehouses.update',
  'warehouses.view'
)
ON CONFLICT DO NOTHING;


-- >>>>>>>>>>>>>> MIGRATION: 20260817014000_add_analytics_ai_permissions.sql <<<<<<<<<<<<<<
-- Insert new permissions
INSERT INTO public.permissions (name, description) VALUES
('analytics.view', 'View Analytics Dashboard'),
('ai.view', 'Access AI Assistant')
ON CONFLICT (name) DO NOTHING;

-- Map to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Manager' AND p.name IN ('analytics.view', 'ai.view')
ON CONFLICT DO NOTHING;


-- >>>>>>>>>>>>>> MIGRATION: 20260817015000_create_settings.sql <<<<<<<<<<<<<<
-- Create business_settings table
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'Supplyra Inc.',
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'SAR',
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    logo_url TEXT,
    default_discount_limit DECIMAL(5,2) DEFAULT 5.00,
    invoice_format VARCHAR(50) DEFAULT 'INV-YYYY-MM-SEQ',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row if not exists
INSERT INTO public.business_settings (company_name, phone, email, address)
SELECT 'Supplyra Inc.', '+966 50 000 0000', 'contact@supplyra.com', 'Riyadh, Saudi Arabia'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- Permissions
INSERT INTO public.permissions (name, description) VALUES
('settings.view', 'View Settings'),
('settings.update', 'Update Settings')
ON CONFLICT (name) DO NOTHING;

-- Map to Manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Manager' AND p.name IN ('settings.view', 'settings.update')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: any authenticated user can view business settings (so the app can load currency, timezone, etc.)
CREATE POLICY "Anyone can view business settings"
    ON public.business_settings FOR SELECT
    TO authenticated
    USING (true);

-- Update policy: only Managers can update (based on role check)
CREATE POLICY "Managers can update business settings"
    ON public.business_settings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'Manager'
        )
    );


-- >>>>>>>>>>>>>> MIGRATION: 20260817020000_order_items_warehouse.sql <<<<<<<<<<<<<<
-- Add warehouse_id to order_items to support per-item warehouse selection
ALTER TABLE public.order_items 
ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT;

-- Backfill warehouse_id from orders table for existing records
UPDATE public.order_items oi 
SET warehouse_id = o.warehouse_id 
FROM public.orders o 
WHERE oi.order_id = o.id;

-- Make it NOT NULL for future if required, but let's keep it nullable as fallback
-- ALTER TABLE public.order_items ALTER COLUMN warehouse_id SET NOT NULL;

-- Update the confirm_sale function to use per-item warehouse_id if available, falling back to order's warehouse_id
CREATE OR REPLACE FUNCTION confirm_sale(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_order_warehouse_id UUID;
    v_item RECORD;
    v_batch RECORD;
BEGIN
    SELECT status, warehouse_id INTO v_status, v_order_warehouse_id
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_status != 'PENDING' THEN
        RAISE EXCEPTION 'Order is already %', v_status;
    END IF;

    FOR v_item IN SELECT id, product_id, quantity, warehouse_id FROM public.order_items WHERE order_id = p_order_id LOOP
        -- Use the item's specific warehouse if provided, otherwise fallback to the order's warehouse
        FOR v_batch IN SELECT batch_id, deducted_qty FROM deduct_stock_fefo(v_item.product_id, COALESCE(v_item.warehouse_id, v_order_warehouse_id), v_item.quantity) LOOP
            INSERT INTO public.order_item_batches (order_item_id, batch_id, quantity)
            VALUES (v_item.id, v_batch.batch_id, v_batch.deducted_qty);
        END LOOP;
    END LOOP;

    UPDATE public.orders
    SET 
        status = 'CONFIRMED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_order_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>>>>>>>>>>>>> MIGRATION: 20260817025500_force_products_delete.sql <<<<<<<<<<<<<<
-- Migration 024: Force products.delete permission for Manager
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  -- Ensure the permission exists
  INSERT INTO public.permissions (name, description) 
  VALUES ('products.delete', 'Delete products')
  ON CONFLICT (name) DO NOTHING;

  -- Ensure Manager has it
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions WHERE name = 'products.delete'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;


-- >>>>>>>>>>>>>> MIGRATION: 20260817031500_fix_brands_permissions.sql <<<<<<<<<<<<<<
-- Migration 025: Fix Brands Permissions for Dynamic Creation
-- Grant INSERT and UPDATE privileges to authenticated users on the brands table
GRANT INSERT, UPDATE ON public.brands TO authenticated;

-- Create policies that allow authenticated users with product creation/update permissions 
-- to create or update brands on the fly.
CREATE POLICY "Brands Insert" ON public.brands 
FOR INSERT TO authenticated 
WITH CHECK (
    public.has_permission('products.create') OR 
    public.has_permission('products.update')
);

CREATE POLICY "Brands Update" ON public.brands 
FOR UPDATE TO authenticated 
USING (
    public.has_permission('products.create') OR 
    public.has_permission('products.update')
);


-- >>>>>>>>>>>>>> MIGRATION: 20260817044600_debug_get_batches.sql <<<<<<<<<<<<<<
CREATE OR REPLACE FUNCTION public.debug_get_all_batches()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(row_to_json(b)) INTO result FROM public.inventory_batches b;
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>>>>>>>>>>>>> MIGRATION: 20260818143400_add_suppliers_delete_policy.sql <<<<<<<<<<<<<<
-- Migration: Add suppliers delete policy
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  -- Ensure the permission exists
  INSERT INTO public.permissions (name, description) 
  VALUES ('suppliers.delete', 'Delete suppliers')
  ON CONFLICT (name) DO NOTHING;

  -- Ensure Manager has it
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions WHERE name = 'suppliers.delete'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant DELETE to authenticated users for the suppliers table
GRANT DELETE ON public.suppliers TO authenticated;

-- Add RLS policy for DELETE based on RBAC
DROP POLICY IF EXISTS "Suppliers Delete" ON public.suppliers;
CREATE POLICY "Suppliers Delete" 
ON public.suppliers 
FOR DELETE 
TO authenticated 
USING (public.has_permission('suppliers.delete'));


-- >>>>>>>>>>>>>> MIGRATION: 20260818165000_add_supplier_location.sql <<<<<<<<<<<<<<
-- Migration: Add location columns to suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8);


-- >>>>>>>>>>>>>> MIGRATION: 20260819204500_add_customers_delete_policy.sql <<<<<<<<<<<<<<
-- Migration: Add customers delete policy and table permissions
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  -- Ensure the permission exists in permissions table
  INSERT INTO public.permissions (name, description) 
  VALUES ('customers.delete', 'Delete customers')
  ON CONFLICT (name) DO NOTHING;

  -- Ensure Manager role has customers.delete permission assigned
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions WHERE name = 'customers.delete'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant table-level DELETE permission to authenticated role
GRANT DELETE ON public.customers TO authenticated;
GRANT DELETE ON public.customer_locations TO authenticated;

-- Add RLS policy for DELETE based on RBAC has_permission check
DROP POLICY IF EXISTS "Customers Delete" ON public.customers;
CREATE POLICY "Customers Delete" 
ON public.customers 
FOR DELETE 
TO authenticated 
USING (public.has_permission('customers.delete'));

DROP POLICY IF EXISTS "Customer Locations Delete" ON public.customer_locations;
CREATE POLICY "Customer Locations Delete" 
ON public.customer_locations 
FOR DELETE 
TO authenticated 
USING (public.has_permission('customers.delete'));


-- >>>>>>>>>>>>>> MIGRATION: 20260822170000_add_sales_delete_policy_and_rpc.sql <<<<<<<<<<<<<<
-- Migration: Add strict RBAC-based RLS delete policies for cancelled sales orders

-- 1. Ensure permissions exist and are mapped to Manager
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  INSERT INTO public.permissions (name, description) VALUES
    ('sales.delete', 'Delete sales orders'),
    ('sales.cancel', 'Cancel sales orders')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions 
    WHERE name IN ('sales.delete', 'sales.cancel')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- 2. Grants for table DELETE operations
GRANT DELETE ON public.orders TO authenticated;
GRANT DELETE ON public.order_items TO authenticated;
GRANT DELETE ON public.order_item_batches TO authenticated;
GRANT DELETE ON public.payments TO authenticated;

-- 3. Strict RLS Policies for DELETE:
-- An order can ONLY be deleted by an authorized user (has 'sales.delete' or 'sales.cancel') AND ONLY when status is 'CANCELLED'
DROP POLICY IF EXISTS "Orders Delete" ON public.orders;
CREATE POLICY "Orders Delete" 
ON public.orders 
FOR DELETE 
TO authenticated 
USING (
  (public.has_permission('sales.delete') OR public.has_permission('sales.cancel'))
  AND status = 'CANCELLED'
);

-- Order items can ONLY be deleted if user is authorized AND parent order is CANCELLED
DROP POLICY IF EXISTS "Order Items Delete" ON public.order_items;
CREATE POLICY "Order Items Delete" 
ON public.order_items 
FOR DELETE 
TO authenticated 
USING (
  (public.has_permission('sales.delete') OR public.has_permission('sales.cancel'))
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.status = 'CANCELLED')
);

-- Order item batches can ONLY be deleted if user is authorized AND parent order is CANCELLED
DROP POLICY IF EXISTS "Order Item Batches Delete" ON public.order_item_batches;
CREATE POLICY "Order Item Batches Delete" 
ON public.order_item_batches 
FOR DELETE 
TO authenticated 
USING (
  (public.has_permission('sales.delete') OR public.has_permission('sales.cancel'))
  AND EXISTS (
    SELECT 1 FROM public.order_items oi 
    JOIN public.orders o ON o.id = oi.order_id 
    WHERE oi.id = order_item_batches.order_item_id AND o.status = 'CANCELLED'
  )
);

-- Payments can ONLY be deleted if user is authorized AND parent order is CANCELLED
DROP POLICY IF EXISTS "Payments Delete" ON public.payments;
CREATE POLICY "Payments Delete" 
ON public.payments 
FOR DELETE 
TO authenticated 
USING (
  (public.has_permission('sales.delete') OR public.has_permission('sales.cancel'))
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.status = 'CANCELLED')
);


-- >>>>>>>>>>>>>> MIGRATION: 20260822174500_fix_sales_edit_rls.sql <<<<<<<<<<<<<<
-- Migration: Allow authorized users to update and manage order_items and payments during invoice edit

-- 1. Ensure permissions exist
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions 
    WHERE name IN ('sales.view', 'sales.create', 'sales.update', 'sales.cancel', 'sales.delete', 'sales.receive_payment')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- 2. Grants for table operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_item_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- 3. RLS for order_items (INSERT, UPDATE, DELETE during order editing or cancellation)
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items" 
ON public.order_items 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_permission('sales.create') OR public.has_permission('sales.update'));

DROP POLICY IF EXISTS "Users can update order items" ON public.order_items;
CREATE POLICY "Users can update order items" 
ON public.order_items 
FOR UPDATE 
TO authenticated 
USING (public.has_permission('sales.update')) 
WITH CHECK (public.has_permission('sales.update'));

DROP POLICY IF EXISTS "Order Items Delete" ON public.order_items;
CREATE POLICY "Order Items Delete" 
ON public.order_items 
FOR DELETE 
TO authenticated 
USING (
  public.has_permission('sales.update')
  OR (
    (public.has_permission('sales.delete') OR public.has_permission('sales.cancel'))
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.status = 'CANCELLED')
  )
);

-- 4. RLS for order_item_batches (management during order editing or cancellation)
DROP POLICY IF EXISTS "Order Item Batches Delete" ON public.order_item_batches;
CREATE POLICY "Order Item Batches Delete" 
ON public.order_item_batches 
FOR DELETE 
TO authenticated 
USING (
  public.has_permission('sales.update')
  OR (
    (public.has_permission('sales.delete') OR public.has_permission('sales.cancel'))
    AND EXISTS (
      SELECT 1 FROM public.order_items oi 
      JOIN public.orders o ON o.id = oi.order_id 
      WHERE oi.id = order_item_batches.order_item_id AND o.status = 'CANCELLED'
    )
  )
);

DROP POLICY IF EXISTS "Users can insert order item batches" ON public.order_item_batches;
CREATE POLICY "Users can insert order item batches" 
ON public.order_item_batches 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_permission('sales.create') OR public.has_permission('sales.update'));


-- >>>>>>>>>>>>>> MIGRATION: 20260822180000_payments_rls_policies.sql <<<<<<<<<<<<<<
-- Migration: Ensure authorized users can insert and update payments when confirming sales orders

-- 1. Ensure permissions exist and map to Manager
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  INSERT INTO public.permissions (name, description) VALUES
    ('sales.receive_payment', 'Receive and record sales payments')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions 
    WHERE name IN ('sales.receive_payment', 'sales.create', 'sales.update')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- 2. Grants for table operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- 3. RLS for payments table
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
CREATE POLICY "Users can create payments" 
ON public.payments 
FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_permission('sales.receive_payment') 
  OR public.has_permission('sales.create') 
  OR public.has_permission('sales.update')
);

DROP POLICY IF EXISTS "Users can update payments" ON public.payments;
CREATE POLICY "Users can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated 
USING (
  public.has_permission('sales.receive_payment') 
  OR public.has_permission('sales.update')
)
WITH CHECK (
  public.has_permission('sales.receive_payment') 
  OR public.has_permission('sales.update')
);


-- >>>>>>>>>>>>>> MIGRATION: 20260822180500_purchase_edit_rls.sql <<<<<<<<<<<<<<
-- Migration: Allow purchases.update to insert and delete purchase_items during invoice editing

DROP POLICY IF EXISTS "Purchase Items Insert" ON public.purchase_items;
CREATE POLICY "Purchase Items Insert" 
ON public.purchase_items 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_permission('purchases.create') OR public.has_permission('purchases.update'));

DROP POLICY IF EXISTS "Purchase Items Delete" ON public.purchase_items;
CREATE POLICY "Purchase Items Delete" 
ON public.purchase_items 
FOR DELETE 
TO authenticated 
USING (public.has_permission('purchases.cancel') OR public.has_permission('purchases.update'));


-- >>>>>>>>>>>>>> SEED DATA <<<<<<<<<<<<<<
-- DATA REPAIR / SEED script for Phase 1 database

DO $$
DECLARE
  v_manager_role_id UUID;
  v_sales_role_id UUID;
  v_warehouse_role_id UUID;
  v_purchasing_role_id UUID;
BEGIN
  -- 1. Ensure these roles exist
  INSERT INTO public.roles (name, description)
  VALUES 
    ('Manager', 'Full access to all system modules'),
    ('Sales', 'Access to sales and customers'),
    ('Warehouse', 'Access to inventory and warehouses'),
    ('Purchasing', 'Access to purchasing and suppliers')
  ON CONFLICT (name) DO NOTHING;

  -- 2. Ensure EXACT 23 permissions exist
  INSERT INTO public.permissions (name, description)
  VALUES 
    ('users.view', 'View user list and details'),
    ('users.create', 'Invite or create new users'),
    ('users.update', 'Update user profiles'),
    ('users.activate', 'Activate or deactivate users'),
    ('users.assign_role', 'Assign roles to users'),
    ('roles.view', 'View roles'),
    ('permissions.view', 'View permissions'),
    ('products.view', 'View products'),
    ('products.create', 'Create products'),
    ('products.update', 'Update products'),
    ('products.deactivate', 'Deactivate products'),
    ('suppliers.view', 'View suppliers'),
    ('suppliers.create', 'Create suppliers'),
    ('suppliers.update', 'Update suppliers'),
    ('suppliers.deactivate', 'Deactivate suppliers'),
    ('customers.view', 'View customers'),
    ('customers.create', 'Create customers'),
    ('customers.update', 'Update customers'),
    ('customers.deactivate', 'Deactivate customers'),
    ('warehouses.view', 'View warehouses'),
    ('warehouses.create', 'Create warehouses'),
    ('warehouses.update', 'Update warehouses'),
    ('warehouses.deactivate', 'Deactivate warehouses')
  ON CONFLICT (name) DO NOTHING;

  -- Get Role IDs
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  SELECT id INTO v_sales_role_id FROM public.roles WHERE name = 'Sales';
  SELECT id INTO v_warehouse_role_id FROM public.roles WHERE name = 'Warehouse';
  SELECT id INTO v_purchasing_role_id FROM public.roles WHERE name = 'Purchasing';

  -- 3. Assign all 23 permissions to Manager
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- 4. Assign specific permissions to Sales, Warehouse, Purchasing
  IF v_sales_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_sales_role_id, id FROM public.permissions 
    WHERE name IN ('customers.view', 'customers.create', 'customers.update', 'products.view')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  IF v_warehouse_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_warehouse_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'warehouses.view')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  IF v_purchasing_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_purchasing_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'suppliers.view', 'suppliers.create', 'suppliers.update')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- 5. Repair existing Auth user's public.profiles row
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (
      'dd8d7896-757f-40c8-9f9f-c4c3031f0730', 
      'System', 
      'Manager', 
      v_manager_role_id,
      true
    )
    ON CONFLICT (id) DO UPDATE SET 
      role_id = EXCLUDED.role_id,
      active = EXCLUDED.active;
  END IF;

END $$;

-- READ-ONLY Verification Query
SELECT 
  (SELECT count(*) FROM public.roles) as roles_count,
  (SELECT count(*) FROM public.permissions) as permissions_count,
  (SELECT count(*) FROM public.role_permissions) as role_permissions_count,
  (SELECT count(*) FROM public.profiles) as profiles_count,
  r.name as current_user_role,
  p.active as current_user_active
FROM public.profiles p
LEFT JOIN public.roles r ON p.role_id = r.id
WHERE p.id = 'dd8d7896-757f-40c8-9f9f-c4c3031f0730';

