-- Migration 015: Users Email RPC

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  first_name TEXT,
  last_name TEXT,
  role_id UUID,
  active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RBAC Security Guard: Ensure the executing user has the 'users.view' permission
  IF NOT public.has_permission('users.view') THEN
    RAISE EXCEPTION 'Access denied. Missing users.view permission.';
  END IF;

  -- Return only the safe, required fields
  RETURN QUERY
  SELECT 
    au.id,
    au.email::VARCHAR,
    p.first_name,
    p.last_name,
    p.role_id,
    p.active,
    p.created_at
  FROM 
    auth.users au
  JOIN 
    public.profiles p ON au.id = p.id;
END;
$$;

-- Grant EXECUTE permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
