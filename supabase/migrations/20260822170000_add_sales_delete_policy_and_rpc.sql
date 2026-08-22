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
