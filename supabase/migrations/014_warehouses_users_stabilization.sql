-- Migration 014: Warehouses and Users RBAC Stabilization

-- =========================================================================
-- 1. WAREHOUSES STABILIZATION
-- =========================================================================

-- Grant necessary privileges
GRANT SELECT, INSERT, UPDATE ON public.warehouses TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to prevent duplicates
DROP POLICY IF EXISTS "Allow authenticated full access to warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouses View" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouses Insert" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouses Update" ON public.warehouses;

-- Create secure RBAC policies for warehouses
CREATE POLICY "Warehouses View" ON public.warehouses 
    FOR SELECT TO authenticated 
    USING (public.has_permission('warehouses.view'));

CREATE POLICY "Warehouses Insert" ON public.warehouses 
    FOR INSERT TO authenticated 
    WITH CHECK (public.has_permission('warehouses.create'));

CREATE POLICY "Warehouses Update" ON public.warehouses 
    FOR UPDATE TO authenticated 
    USING (public.has_permission('warehouses.update')) 
    WITH CHECK (public.has_permission('warehouses.update'));


-- =========================================================================
-- 2. USERS (PROFILES & RBAC TABLES) STABILIZATION
-- =========================================================================

-- Grant necessary privileges
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.profiles;

-- Profile Policies
CREATE POLICY "Users can read own profile" ON public.profiles 
    FOR SELECT TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own basic info" ON public.profiles 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Managers can view all profiles" ON public.profiles 
    FOR SELECT TO authenticated 
    USING (public.has_permission('users.view'));

CREATE POLICY "Managers can update all profiles" ON public.profiles 
    FOR UPDATE TO authenticated 
    USING (public.has_permission('users.update') OR public.has_permission('users.activate') OR public.has_permission('users.assign_role'))
    WITH CHECK (public.has_permission('users.update') OR public.has_permission('users.activate') OR public.has_permission('users.assign_role'));


-- Roles Policies
DROP POLICY IF EXISTS "Managers can view roles" ON public.roles;
DROP POLICY IF EXISTS "Allow authenticated to read roles" ON public.roles;

CREATE POLICY "Allow authenticated to read roles" ON public.roles 
    FOR SELECT TO authenticated 
    USING (true);


-- Permissions Policies
DROP POLICY IF EXISTS "Managers can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Allow authenticated to read permissions" ON public.permissions;

CREATE POLICY "Allow authenticated to read permissions" ON public.permissions 
    FOR SELECT TO authenticated 
    USING (true);


-- Role Permissions Policies
DROP POLICY IF EXISTS "Managers can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Allow authenticated to read role_permissions" ON public.role_permissions;

CREATE POLICY "Allow authenticated to read role_permissions" ON public.role_permissions 
    FOR SELECT TO authenticated 
    USING (true);

-- =========================================================================
-- 3. TRIGGER SAFETY: PREVENT UNAUTHORIZED PRIVILEGE ESCALATION
-- =========================================================================

CREATE OR REPLACE FUNCTION public.restrict_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (auth.uid() = NEW.id) THEN
    -- A user is updating themselves. They cannot change their role_id or active status
    IF (OLD.role_id IS DISTINCT FROM NEW.role_id) OR (OLD.active IS DISTINCT FROM NEW.active) THEN
      RAISE EXCEPTION 'Not authorized to change role or active status';
    END IF;
  ELSE
    -- Someone else is updating this profile. They must have appropriate RBAC permissions.
    IF (OLD.role_id IS DISTINCT FROM NEW.role_id) AND NOT public.has_permission('users.assign_role') THEN
        RAISE EXCEPTION 'Not authorized to assign roles';
    END IF;
    
    IF (OLD.active IS DISTINCT FROM NEW.active) AND NOT public.has_permission('users.activate') THEN
        RAISE EXCEPTION 'Not authorized to activate/deactivate users';
    END IF;

    -- If any other field is changing, they must have users.update
    IF (OLD.first_name IS DISTINCT FROM NEW.first_name OR OLD.last_name IS DISTINCT FROM NEW.last_name OR OLD.phone IS DISTINCT FROM NEW.phone) AND NOT public.has_permission('users.update') THEN
        RAISE EXCEPTION 'Not authorized to update other profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 3.5 ADD DEACTIVATE PERMISSION
-- =========================================================================
INSERT INTO public.permissions (name, description) VALUES 
  ('warehouses.deactivate', 'Activate or deactivate warehouses')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions WHERE name = 'warehouses.deactivate'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- =========================================================================
-- 4. GRANTS FOR RPC FUNCTIONS
-- =========================================================================

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
