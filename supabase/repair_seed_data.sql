-- Repair and seed base permissions and roles safely
DO $$
DECLARE
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_cashier_role_id UUID;
  v_warehouse_role_id UUID;
  v_purchasing_role_id UUID;
BEGIN
  -- 1. Ensure all core roles exist
  INSERT INTO public.roles (name, description, is_system)
  VALUES 
    ('Admin', 'Full administrative access', true),
    ('Manager', 'Management and approval access', true),
    ('Cashier', 'POS and sales operations', false),
    ('Warehouse', 'Inventory management and warehouse operations', false),
    ('Purchasing', 'Purchasing and supplier operations', false)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'Admin';
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  SELECT id INTO v_cashier_role_id FROM public.roles WHERE name = 'Cashier';
  SELECT id INTO v_warehouse_role_id FROM public.roles WHERE name = 'Warehouse';
  SELECT id INTO v_purchasing_role_id FROM public.roles WHERE name = 'Purchasing';

  -- 2. Ensure all core permissions exist
  INSERT INTO public.permissions (name, module, description)
  VALUES 
    ('products.view', 'products', 'View products'),
    ('products.create', 'products', 'Create products'),
    ('products.update', 'products', 'Update products'),
    ('products.delete', 'products', 'Delete products'),
    ('inventory.view', 'inventory', 'View inventory'),
    ('inventory.adjust', 'inventory', 'Adjust inventory'),
    ('sales.view', 'sales', 'View sales'),
    ('sales.create', 'sales', 'Create sales orders'),
    ('sales.update', 'sales', 'Update sales orders'),
    ('sales.delete', 'sales', 'Delete sales orders'),
    ('sales.discount.approve', 'sales', 'Approve sales discounts over 5%'),
    ('purchases.view', 'purchases', 'View purchases'),
    ('purchases.create', 'purchases', 'Create purchase orders'),
    ('purchases.update', 'purchases', 'Update purchase orders'),
    ('purchases.delete', 'purchases', 'Delete purchase orders'),
    ('suppliers.view', 'suppliers', 'View suppliers'),
    ('suppliers.create', 'suppliers', 'Create suppliers'),
    ('suppliers.update', 'suppliers', 'Update suppliers'),
    ('suppliers.delete', 'suppliers', 'Delete suppliers'),
    ('customers.view', 'customers', 'View customers'),
    ('customers.create', 'customers', 'Create customers'),
    ('customers.update', 'customers', 'Update customers'),
    ('customers.delete', 'customers', 'Delete customers'),
    ('warehouses.view', 'warehouses', 'View warehouses'),
    ('warehouses.create', 'warehouses', 'Create warehouses'),
    ('warehouses.update', 'warehouses', 'Update warehouses'),
    ('warehouses.delete', 'warehouses', 'Delete warehouses'),
    ('users.view', 'users', 'View users'),
    ('users.create', 'users', 'Create users'),
    ('users.update', 'users', 'Update users'),
    ('users.delete', 'users', 'Delete users'),
    ('analytics.view', 'analytics', 'View analytics dashboard'),
    ('ai.view', 'ai', 'Access AI Assistant'),
    ('settings.view', 'settings', 'View system settings'),
    ('settings.edit', 'settings', 'Edit system settings')
  ON CONFLICT (name) DO NOTHING;

  -- 3. Grant Admin all permissions
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- 4. Grant Manager all permissions
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- 5. Grant Cashier sales and products permissions
  IF v_cashier_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_cashier_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'sales.view', 'sales.create', 'customers.view', 'customers.create')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- 6. Grant Warehouse permissions
  IF v_warehouse_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_warehouse_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'inventory.view', 'inventory.adjust', 'warehouses.view')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- 7. Grant Purchasing permissions
  IF v_purchasing_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_purchasing_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'suppliers.view', 'suppliers.create', 'suppliers.update', 'purchases.view', 'purchases.create')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- 8. If any profile exists without a role, assign manager role
  IF v_manager_role_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role_id = v_manager_role_id, active = true
    WHERE role_id IS NULL;
  END IF;

END $$;

-- Verification Query
SELECT 
  (SELECT count(*) FROM public.roles) as roles_count,
  (SELECT count(*) FROM public.permissions) as permissions_count,
  (SELECT count(*) FROM public.role_permissions) as role_permissions_count,
  (SELECT count(*) FROM public.profiles) as profiles_count;
