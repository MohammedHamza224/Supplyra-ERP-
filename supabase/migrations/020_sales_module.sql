-- Migration 020: Sales Module

-- 0. Ensure inventory_batches and deduct_stock_fefo exist in case the remote DB lost them
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_inventory_batches_updated_at') THEN
        CREATE TRIGGER handle_inventory_batches_updated_at 
        BEFORE UPDATE ON public.inventory_batches
        FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();
    END IF;
END $$;

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'inventory_batches' AND policyname = 'Allow authenticated full access to inventory_batches'
    ) THEN
        CREATE POLICY "Allow authenticated full access to inventory_batches" 
        ON public.inventory_batches FOR ALL TO authenticated USING (true);
    END IF;
END $$;

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
    IF (SELECT COALESCE(SUM(quantity), 0) 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND active = true 
          AND expiry_date >= CURRENT_DATE) < p_quantity THEN
        RAISE EXCEPTION 'Insufficient valid stock available in warehouse';
    END IF;

    CREATE TEMP TABLE IF NOT EXISTS temp_deductions (
        b_id UUID,
        d_qty NUMERIC
    ) ON COMMIT DROP;
    
    TRUNCATE temp_deductions;

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

        UPDATE public.inventory_batches 
        SET quantity = quantity - v_deduct 
        WHERE id = v_batch.id;

        INSERT INTO temp_deductions (b_id, d_qty) VALUES (v_batch.id, v_deduct);

        v_remaining := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'Failed to deduct full quantity due to concurrency issue';
    END IF;

    RETURN QUERY SELECT b_id, d_qty FROM temp_deductions;
END;
$$;


-- 1. Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED')),
    notes TEXT,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Create order_items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create order_item_batches table (Ledger for exactly which batches were consumed)
CREATE TABLE public.order_item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'BANK', 'WALLET')),
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Triggers for updated_at
CREATE TRIGGER handle_orders_updated_at 
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

CREATE TRIGGER handle_order_items_updated_at 
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 6. Auto-generate Order Number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_seq INT;
BEGIN
    year_prefix := 'SO-' || to_char(CURRENT_DATE, 'YYYY') || '-';
    
    LOCK TABLE public.orders IN EXCLUSIVE MODE;
    
    SELECT COALESCE(MAX(SUBSTRING(order_number FROM LENGTH(year_prefix) + 1)::INT), 0) + 1
    INTO next_seq
    FROM public.orders
    WHERE order_number LIKE year_prefix || '%';
    
    NEW.order_number := year_prefix || LPAD(next_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE PROCEDURE generate_order_number();


-- 7. RPC Functions for Confirm and Cancel Sales

CREATE OR REPLACE FUNCTION confirm_sale(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_warehouse_id UUID;
    v_item RECORD;
    v_batch RECORD;
BEGIN
    SELECT status, warehouse_id INTO v_status, v_warehouse_id
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_status != 'PENDING' THEN
        RAISE EXCEPTION 'Order is already %', v_status;
    END IF;

    FOR v_item IN SELECT id, product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
        FOR v_batch IN SELECT batch_id, deducted_qty FROM deduct_stock_fefo(v_item.product_id, v_warehouse_id, v_item.quantity) LOOP
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


CREATE OR REPLACE FUNCTION cancel_sale(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_batch_record RECORD;
BEGIN
    SELECT status INTO v_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Order is already cancelled';
    END IF;

    IF v_status IN ('CONFIRMED', 'PREPARING', 'READY', 'COMPLETED') THEN
        FOR v_batch_record IN 
            SELECT oib.batch_id, SUM(oib.quantity) as restore_qty
            FROM public.order_item_batches oib
            JOIN public.order_items oi ON oib.order_item_id = oi.id
            WHERE oi.order_id = p_order_id
            GROUP BY oib.batch_id
        LOOP
            UPDATE public.inventory_batches
            SET quantity = quantity + v_batch_record.restore_qty
            WHERE id = v_batch_record.batch_id;
        END LOOP;
    END IF;

    UPDATE public.orders
    SET 
        status = 'CANCELLED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_order_id;
    
    UPDATE public.payments
    SET status = 'REFUNDED'
    WHERE order_id = p_order_id AND status = 'COMPLETED';

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Add Permissions
INSERT INTO public.permissions (name, description) VALUES
    ('sales.view', 'View Sales'),
    ('sales.create', 'Create Sales'),
    ('sales.update', 'Update Sales'),
    ('sales.cancel', 'Cancel Sales'),
    ('sales.receive_payment', 'Receive Payments')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager'
  AND p.name IN ('sales.view', 'sales.create', 'sales.update', 'sales.cancel', 'sales.receive_payment')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 9. RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders" ON public.orders FOR SELECT TO authenticated USING (has_permission('sales.view'));
CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT TO authenticated USING (has_permission('sales.view'));
CREATE POLICY "Users can view order item batches" ON public.order_item_batches FOR SELECT TO authenticated USING (has_permission('sales.view'));
CREATE POLICY "Users can view payments" ON public.payments FOR SELECT TO authenticated USING (has_permission('sales.view'));

CREATE POLICY "Users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (has_permission('sales.create'));
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (has_permission('sales.create'));
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (has_permission('sales.receive_payment'));

CREATE POLICY "Users can update orders" ON public.orders FOR UPDATE TO authenticated USING (has_permission('sales.update')) WITH CHECK (has_permission('sales.update'));
CREATE POLICY "Users can update payments" ON public.payments FOR UPDATE TO authenticated USING (has_permission('sales.receive_payment')) WITH CHECK (has_permission('sales.receive_payment'));
