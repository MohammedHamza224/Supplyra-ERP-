-- Migration 012: Inventory Batches and Expiry Management

-- 1. Create the inventory_batches table
CREATE TABLE public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    production_date DATE,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(product_id, warehouse_id, batch_number)
);

-- Update timestamp trigger
CREATE TRIGGER handle_inventory_batches_updated_at 
  BEFORE UPDATE ON public.inventory_batches
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to inventory_batches" 
ON public.inventory_batches FOR ALL TO authenticated USING (true);


-- 2. View for Inventory with Expiry Status Calculation
CREATE OR REPLACE VIEW public.inventory_batches_view AS
SELECT 
    b.*,
    p.name AS product_name,
    p.product_code AS product_code,
    c.name AS category_name,
    w.name AS warehouse_name,
    CASE 
        WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN b.expiry_date = CURRENT_DATE THEN 'Expires Today'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS expiry_status
FROM 
    public.inventory_batches b
JOIN public.products p ON b.product_id = p.id
JOIN public.warehouses w ON b.warehouse_id = w.id
LEFT JOIN public.categories c ON p.category_id = c.id;


-- 3. FEFO Stock Deduction Function (For future use)
-- This function deduces stock safely, starting with the earliest expiry_date.
CREATE OR REPLACE FUNCTION deduct_stock_fefo(
    p_product_id UUID, 
    p_warehouse_id UUID, 
    p_quantity NUMERIC
) 
RETURNS TABLE (
    batch_id UUID,
    deducted_qty NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining NUMERIC := p_quantity;
    v_batch RECORD;
    v_deduct NUMERIC;
BEGIN
    -- Ensure we don't deduct more than total available valid stock
    IF (SELECT COALESCE(SUM(quantity), 0) 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND active = true 
          AND expiry_date >= CURRENT_DATE) < p_quantity THEN
        RAISE EXCEPTION 'Insufficient valid stock available in warehouse';
    END IF;

    -- Create temporary table to track deductions
    CREATE TEMP TABLE IF NOT EXISTS temp_deductions (
        b_id UUID,
        d_qty NUMERIC
    ) ON COMMIT DROP;
    
    TRUNCATE temp_deductions;

    -- Iterate through valid batches sorted by expiry date ascending (FEFO)
    FOR v_batch IN 
        SELECT id, quantity 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND active = true 
          AND expiry_date >= CURRENT_DATE 
          AND quantity > 0
        ORDER BY expiry_date ASC, created_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;

        IF v_batch.quantity >= v_remaining THEN
            v_deduct := v_remaining;
        ELSE
            v_deduct := v_batch.quantity;
        END IF;

        -- Update batch quantity
        UPDATE public.inventory_batches 
        SET quantity = quantity - v_deduct 
        WHERE id = v_batch.id;

        -- Record deduction
        INSERT INTO temp_deductions (b_id, d_qty) VALUES (v_batch.id, v_deduct);

        v_remaining := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'Failed to deduct full quantity due to concurrency issue';
    END IF;

    RETURN QUERY SELECT b_id, d_qty FROM temp_deductions;
END;
$$;
