-- Migration 008: Bootstrap first user as Manager
-- Fixes the Phase 1 integration issue where the initial user has no role assigned.
DO $$
DECLARE
  v_user_count INT;
  v_manager_role_id UUID;
  v_first_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  
  -- We ONLY bootstrap if there is exactly 1 user (the initial admin)
  IF v_user_count = 1 THEN
    SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager';
    SELECT id INTO v_first_user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
    
    IF v_first_user_id IS NOT NULL AND v_manager_role_id IS NOT NULL THEN
      UPDATE public.profiles SET role_id = v_manager_role_id WHERE id = v_first_user_id AND role_id IS NULL;
    END IF;
  END IF;
END;
$$;
