-- Add warehouse_id to order_items to support per-item warehouse selection
ALTER TABLE public.order_items 
ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT;

-- Backfill warehouse_id from orders table for existing records
UPDATE public.order_items oi 
SET warehouse_id = o.warehouse_id 
FROM public.orders o 
WHERE oi.order_id = o.id;

-- Make it NOT NULL for future if required, but let's keep it nullable as fallback
-- ALTER TABLE public.order_items ALTER COLUMN warehouse_id SET NOT NULL;

-- Update the confirm_sale function to use per-item warehouse_id if available, falling back to order's warehouse_id
CREATE OR REPLACE FUNCTION confirm_sale(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_order_warehouse_id UUID;
    v_item RECORD;
    v_batch RECORD;
BEGIN
    SELECT status, warehouse_id INTO v_status, v_order_warehouse_id
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_status != 'PENDING' THEN
        RAISE EXCEPTION 'Order is already %', v_status;
    END IF;

    FOR v_item IN SELECT id, product_id, quantity, warehouse_id FROM public.order_items WHERE order_id = p_order_id LOOP
        -- Use the item's specific warehouse if provided, otherwise fallback to the order's warehouse
        FOR v_batch IN SELECT batch_id, deducted_qty FROM deduct_stock_fefo(v_item.product_id, COALESCE(v_item.warehouse_id, v_order_warehouse_id), v_item.quantity) LOOP
            INSERT INTO public.order_item_batches (order_item_id, batch_id, quantity)
            VALUES (v_item.id, v_batch.batch_id, v_batch.deducted_qty);
        END LOOP;
    END LOOP;

    UPDATE public.orders
    SET 
        status = 'CONFIRMED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_order_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
