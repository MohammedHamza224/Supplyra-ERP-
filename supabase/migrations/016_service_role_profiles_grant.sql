-- Migration 016: Grant service_role privileges on profiles

-- Ensure the service_role has necessary privileges to update profiles during user creation
-- via the trusted Edge Function. This does NOT grant privileges to authenticated or anon.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
