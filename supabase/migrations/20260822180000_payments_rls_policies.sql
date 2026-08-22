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
