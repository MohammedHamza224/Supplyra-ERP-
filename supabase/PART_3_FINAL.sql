-- ==============================================================
-- PART 3: BUSINESS FUNCTIONS, STORAGE, RLS & SEED DATA
-- ==============================================================

-- 1. Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT r.name INTO v_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid() AND p.active = TRUE;

  RETURN v_role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Get Users with Email RPC
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

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 3. FEFO Stock Deduction Function
CREATE OR REPLACE FUNCTION deduct_stock_fefo(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_quantity NUMERIC,
  p_order_item_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_remaining_qty NUMERIC := p_quantity;
  v_batch RECORD;
  v_deduct_qty NUMERIC;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Deduction quantity must be positive';
  END IF;

  FOR v_batch IN
    SELECT id, quantity, expiry_date
    FROM public.inventory_batches
    WHERE product_id = p_product_id
      AND warehouse_id = p_warehouse_id
      AND quantity > 0
    ORDER BY 
      expiry_date ASC NULLS LAST,
      created_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining_qty <= 0 THEN
      EXIT;
    END IF;

    IF v_batch.quantity >= v_remaining_qty THEN
      v_deduct_qty := v_remaining_qty;
    ELSE
      v_deduct_qty := v_batch.quantity;
    END IF;

    UPDATE public.inventory_batches
    SET quantity = quantity - v_deduct_qty,
        updated_at = NOW()
    WHERE id = v_batch.id;

    INSERT INTO public.order_item_batches (
      id,
      order_item_id,
      batch_id,
      quantity,
      created_at
    ) VALUES (
      gen_random_uuid(),
      p_order_item_id,
      v_batch.id,
      v_deduct_qty,
      NOW()
    );

    v_remaining_qty := v_remaining_qty - v_deduct_qty;
  END LOOP;

  IF v_remaining_qty > 0 THEN
    RAISE EXCEPTION 'Insufficient inventory available for product % in warehouse %. Short by %', 
      p_product_id, p_warehouse_id, v_remaining_qty;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Confirm Sale Function
CREATE OR REPLACE FUNCTION confirm_sale(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft orders can be confirmed. Current status: %', v_order.status;
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    PERFORM deduct_stock_fefo(
      v_item.product_id,
      COALESCE(v_item.warehouse_id, v_order.warehouse_id),
      v_item.quantity,
      v_item.id
    );
  END LOOP;

  UPDATE public.orders
  SET status = 'confirmed',
      confirmed_by = p_user_id,
      confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cancel Sale Function
CREATE OR REPLACE FUNCTION cancel_sale(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_allocation RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled';
  END IF;

  IF v_order.status = 'confirmed' THEN
    FOR v_allocation IN
      SELECT oib.batch_id, oib.quantity
      FROM public.order_item_batches oib
      JOIN public.order_items oi ON oib.order_item_id = oi.id
      WHERE oi.order_id = p_order_id
    LOOP
      UPDATE public.inventory_batches
      SET quantity = quantity + v_allocation.quantity,
          updated_at = NOW()
      WHERE id = v_allocation.batch_id;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_by = p_user_id,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Receive Purchase Function
CREATE OR REPLACE FUNCTION receive_purchase(
  p_purchase_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_purchase RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  IF v_purchase.status != 'pending' AND v_purchase.status != 'draft' THEN
    RAISE EXCEPTION 'Cannot receive purchase in status %', v_purchase.status;
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.purchase_items
    WHERE purchase_id = p_purchase_id
  LOOP
    INSERT INTO public.inventory_batches (
      id,
      product_id,
      warehouse_id,
      batch_number,
      expiry_date,
      quantity,
      cost_price,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_item.product_id,
      v_purchase.warehouse_id,
      COALESCE(v_item.batch_number, 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(v_item.id::TEXT, 1, 4)),
      v_item.expiry_date,
      v_item.quantity,
      v_item.unit_cost,
      NOW(),
      NOW()
    );
  END LOOP;

  UPDATE public.purchases
  SET status = 'received',
      updated_at = NOW()
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Cancel Purchase Function
CREATE OR REPLACE FUNCTION cancel_purchase(
  p_purchase_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_purchase RECORD;
BEGIN
  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  IF v_purchase.status = 'received' THEN
    RAISE EXCEPTION 'Cannot cancel an already received purchase order';
  END IF;

  UPDATE public.purchases
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Discount Approval Functions
CREATE OR REPLACE FUNCTION public.approve_discount(
  p_approval_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_approval RECORD;
BEGIN
  SELECT * INTO v_approval FROM public.discount_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval request not found'; END IF;
  IF v_approval.status != 'pending' THEN RAISE EXCEPTION 'Approval request is not pending'; END IF;

  UPDATE public.discount_approvals
  SET status = 'approved', action_by = p_user_id, action_at = NOW()
  WHERE id = p_approval_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reject_discount(
  p_approval_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_approval RECORD;
BEGIN
  SELECT * INTO v_approval FROM public.discount_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval request not found'; END IF;
  IF v_approval.status != 'pending' THEN RAISE EXCEPTION 'Approval request is not pending'; END IF;

  UPDATE public.discount_approvals
  SET status = 'rejected', action_by = p_user_id, action_at = NOW(), rejection_reason = p_reason
  WHERE id = p_approval_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grants for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- 10. Core RLS Policies (Allow authenticated access to ERP tables)
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'roles', 'permissions', 'role_permissions', 'profiles',
    'categories', 'brands', 'units', 'products', 'product_suppliers',
    'suppliers', 'customers', 'customer_locations', 'warehouses',
    'inventory_batches', 'purchases', 'purchase_items',
    'orders', 'order_items', 'order_item_batches', 'payments',
    'discount_approvals', 'business_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_auth_all_%s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "allow_auth_all_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- 11. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('logos', 'logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('products', 'products', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', true, 20971520, NULL),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access to Logos" ON storage.objects;
CREATE POLICY "Public Access to Logos" ON storage.objects FOR SELECT TO public USING (bucket_id IN ('logos', 'products', 'attachments', 'avatars'));

DROP POLICY IF EXISTS "Authenticated Upload to Buckets" ON storage.objects;
CREATE POLICY "Authenticated Upload to Buckets" ON storage.objects FOR ALL TO authenticated USING (bucket_id IN ('logos', 'products', 'attachments', 'avatars')) WITH CHECK (bucket_id IN ('logos', 'products', 'attachments', 'avatars'));

-- 12. SEED DATA: Roles, Permissions, and Initial Permissions
DO $$
DECLARE
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_cashier_role_id UUID;
  v_warehouse_role_id UUID;
  v_purchasing_role_id UUID;
BEGIN
  -- Insert Roles
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

  -- Insert Permissions
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

  -- Grant all to Admin and Manager
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Grant Cashier
  IF v_cashier_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_cashier_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'sales.view', 'sales.create', 'customers.view', 'customers.create')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Grant Warehouse
  IF v_warehouse_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_warehouse_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'inventory.view', 'inventory.adjust', 'warehouses.view')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Grant Purchasing
  IF v_purchasing_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_purchasing_role_id, id FROM public.permissions 
    WHERE name IN ('products.view', 'suppliers.view', 'suppliers.create', 'suppliers.update', 'purchases.view', 'purchases.create')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Safe manager profile role assignment
  IF v_manager_role_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role_id = v_manager_role_id, active = true
    WHERE role_id IS NULL;
  END IF;

END $$;

-- 13. System Verification
SELECT 
  (SELECT count(*) FROM public.roles) as roles_count,
  (SELECT count(*) FROM public.permissions) as permissions_count,
  (SELECT count(*) FROM public.role_permissions) as role_permissions_count,
  (SELECT count(*) FROM storage.buckets) as storage_buckets_count;
