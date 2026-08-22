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
