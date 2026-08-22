-- Migration 021: Fix Sales Grants

-- Grant necessary privileges to authenticated users for Sales tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_item_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- Also grant execute on the RPC functions if missing
GRANT EXECUTE ON FUNCTION public.confirm_sale(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, UUID) TO authenticated;
