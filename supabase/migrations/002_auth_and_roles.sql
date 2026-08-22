-- Migration 002: Auth, Roles, and Permissions

-- 1. Roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger to roles using Migration 001 function
CREATE TRIGGER handle_roles_updated_at 
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- Insert default roles exactly as requested
INSERT INTO public.roles (name, description) VALUES
    ('Manager', 'Full system access'),
    ('Sales', 'Sales operations and customer management'),
    ('Warehouse', 'Inventory and warehouse operations'),
    ('Purchasing', 'Supplier and purchase order management');

-- 2. Permissions
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Role Permissions (Many-to-Many)
CREATE TABLE public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Profiles (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    role_id UUID REFERENCES public.roles(id), -- Nullable FK, do not assign privileged role automatically
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger to profiles using Migration 001 function
CREATE TRIGGER handle_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 5. Trigger to automatically create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile WITHOUT any privileged role automatically.
  -- role_id remains NULL. Managers must explicitly assign roles later.
  INSERT INTO public.profiles (id, first_name, last_name, role_id)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Security Trigger: Prevent users from updating restricted profile fields
CREATE OR REPLACE FUNCTION public.restrict_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce this restriction when a user is updating their OWN profile
  IF auth.uid() = OLD.id THEN
    -- Prevent role_id change
    IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
      RAISE EXCEPTION 'You are not allowed to change your own role.';
    END IF;
    
    -- Prevent ID change
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'You are not allowed to change your profile ID.';
    END IF;

    -- Prevent created_at change
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'You are not allowed to change your profile creation date.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.restrict_profile_updates();

-- 6. RLS Policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users minimum read access to function
CREATE POLICY "Allow authenticated to read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated to read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated to read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Allow users to read ONLY their own profile. Managers' broad access will be handled in a later RBAC phase.
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Allow users to update their own basic info. 
-- The restrict_profile_updates() trigger ensures they cannot update role_id, id, or created_at.
CREATE POLICY "Users can update own basic info" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
