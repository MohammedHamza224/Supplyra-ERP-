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