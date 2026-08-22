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
