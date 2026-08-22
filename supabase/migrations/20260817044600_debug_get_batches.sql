CREATE OR REPLACE FUNCTION public.debug_get_all_batches()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(row_to_json(b)) INTO result FROM public.inventory_batches b;
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
