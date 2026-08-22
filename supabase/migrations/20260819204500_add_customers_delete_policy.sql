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
