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
