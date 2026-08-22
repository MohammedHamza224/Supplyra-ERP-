-- Migration 009: Repair missing profiles and bootstrap Manager
DO $$
DECLARE
  v_manager_role_id UUID;
  v_first_user_id UUID;
BEGIN
  -- 1. Repair missing profiles
  -- Insert a profile for any auth.users that don't have one in public.profiles
  -- This handles users created before the trigger was attached or if the trigger failed.
  INSERT INTO public.profiles (id, first_name, last_name, role_id)
  SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'first_name', 'System'),
    COALESCE(u.raw_user_meta_data->>'last_name', 'Admin'),
    NULL
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;

  -- 2. Bootstrap the FIRST user as Manager
  -- Get the Manager role ID
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
  
  -- Find the oldest user in auth.users (the account creator/owner)
  SELECT id INTO v_first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  -- Assign Manager role ONLY to the first user
  IF v_first_user_id IS NOT NULL AND v_manager_role_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET role_id = v_manager_role_id 
    WHERE id = v_first_user_id AND (role_id IS NULL OR role_id != v_manager_role_id);
  END IF;

END;
$$;
