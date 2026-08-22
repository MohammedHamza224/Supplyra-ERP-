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
