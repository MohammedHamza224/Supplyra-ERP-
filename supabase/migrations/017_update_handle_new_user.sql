-- Migration 017: Update handle_new_user to read role_id from metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile, extracting role_id from user_metadata if provided
  -- This prevents race conditions where the Edge Function update fails to match the row
  INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(NEW.raw_user_meta_data->>'role_id', '')::uuid,
    COALESCE((NEW.raw_user_meta_data->>'active')::boolean, true)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
