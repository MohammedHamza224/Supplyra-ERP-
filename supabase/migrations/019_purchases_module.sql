-- Migration 019: Purchases Module

-- 1. Create purchases table
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
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

-- 2. Create purchase_items table
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    purchase_price NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    batch_number TEXT,
    production_date DATE,
    expiry_date DATE,
    received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0 AND received_quantity <= quantity),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Triggers for updated_at
CREATE TRIGGER handle_purchases_updated_at 
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

CREATE TRIGGER handle_purchase_items_updated_at 
  BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE PROCEDURE set_current_timestamp_updated_at();

-- 4. Auto-generate Purchase Number
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_seq INT;
BEGIN
    year_prefix := 'PO-' || to_char(CURRENT_DATE, 'YYYY') || '-';
    
    -- Lock table for concurrent safety
    LOCK TABLE public.purchases IN EXCLUSIVE MODE;
    
    SELECT COALESCE(MAX(SUBSTRING(purchase_number FROM LENGTH(year_prefix) + 1)::INT), 0) + 1
    INTO next_seq
    FROM public.purchases
    WHERE purchase_number LIKE year_prefix || '%';
    
    NEW.purchase_number := year_prefix || LPAD(next_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_purchase_number
  BEFORE INSERT ON public.purchases
  FOR EACH ROW
  WHEN (NEW.purchase_number IS NULL OR NEW.purchase_number = '')
  EXECUTE PROCEDURE generate_purchase_number();

-- 5. RPC Functions for Receive and Cancel
CREATE OR REPLACE FUNCTION receive_purchase(p_purchase_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_warehouse_id UUID;
    v_item RECORD;
BEGIN
    -- Get purchase details
    SELECT status, warehouse_id INTO v_status, v_warehouse_id
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE; -- Lock row

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;

    IF v_status = 'RECEIVED' THEN
        RAISE EXCEPTION 'Purchase is already received';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot receive a cancelled purchase';
    END IF;

    -- Update purchase status
    UPDATE public.purchases
    SET status = 'RECEIVED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_purchase_id;

    -- Process each item and insert into inventory_batches
    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id LOOP
        -- For full receive in this phase, received_quantity = quantity
        UPDATE public.purchase_items
        SET received_quantity = quantity,
            updated_at = NOW()
        WHERE id = v_item.id;

        -- Insert or Update batch
        INSERT INTO public.inventory_batches (
            product_id,
            warehouse_id,
            batch_number,
            production_date,
            expiry_date,
            quantity,
            created_by
        ) VALUES (
            v_item.product_id,
            v_warehouse_id,
            COALESCE(v_item.batch_number, 'BATCH-' || to_char(NOW(), 'YYYYMMDD')),
            v_item.production_date,
            COALESCE(v_item.expiry_date, CURRENT_DATE + INTERVAL '365 days'), -- fallback
            v_item.quantity,
            p_user_id
        )
        ON CONFLICT (product_id, warehouse_id, batch_number)
        DO UPDATE SET 
            quantity = public.inventory_batches.quantity + EXCLUDED.quantity,
            updated_at = NOW();
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cancel_purchase(p_purchase_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_warehouse_id UUID;
    v_item RECORD;
BEGIN
    SELECT status, warehouse_id INTO v_status, v_warehouse_id
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Purchase is already cancelled';
    END IF;

    -- Revert inventory if it was received
    IF v_status = 'RECEIVED' OR v_status = 'PARTIALLY_RECEIVED' THEN
        FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id AND received_quantity > 0 LOOP
            -- Decrease batch quantity
            UPDATE public.inventory_batches
            SET quantity = quantity - v_item.received_quantity,
                updated_at = NOW()
            WHERE product_id = v_item.product_id 
              AND warehouse_id = v_warehouse_id 
              AND batch_number = COALESCE(v_item.batch_number, 'BATCH-' || to_char(NOW(), 'YYYYMMDD'));
              
            -- Reset received quantity
            UPDATE public.purchase_items
            SET received_quantity = 0,
                updated_at = NOW()
            WHERE id = v_item.id;
        END LOOP;
    END IF;

    UPDATE public.purchases
    SET status = 'CANCELLED',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_purchase_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Insert Permissions
INSERT INTO public.permissions (name, description) VALUES 
  ('purchases.view', 'View purchases'),
  ('purchases.create', 'Create purchases'),
  ('purchases.update', 'Update purchases'),
  ('purchases.receive', 'Receive purchases'),
  ('purchases.cancel', 'Cancel purchases')
ON CONFLICT DO NOTHING;

-- Grant to Manager Role (Assuming Manager has role_id dynamically found or we just grant to role_id where name='Manager')
DO $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  SELECT id INTO v_manager_role_id FROM public.roles WHERE name = 'Manager' LIMIT 1;
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions 
    WHERE name LIKE 'purchases.%'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 7. Enable RLS & Policies
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;

-- Purchases Policies
CREATE POLICY "Purchases View" ON public.purchases FOR SELECT TO authenticated USING (public.has_permission('purchases.view'));
CREATE POLICY "Purchases Insert" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.has_permission('purchases.create'));
CREATE POLICY "Purchases Update" ON public.purchases FOR UPDATE TO authenticated USING (public.has_permission('purchases.update')) WITH CHECK (public.has_permission('purchases.update'));
CREATE POLICY "Purchases Delete" ON public.purchases FOR DELETE TO authenticated USING (public.has_permission('purchases.cancel'));

-- Purchase Items Policies
CREATE POLICY "Purchase Items View" ON public.purchase_items FOR SELECT TO authenticated USING (public.has_permission('purchases.view'));
CREATE POLICY "Purchase Items Insert" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (public.has_permission('purchases.create'));
CREATE POLICY "Purchase Items Update" ON public.purchase_items FOR UPDATE TO authenticated USING (public.has_permission('purchases.update')) WITH CHECK (public.has_permission('purchases.update'));
CREATE POLICY "Purchase Items Delete" ON public.purchase_items FOR DELETE TO authenticated USING (public.has_permission('purchases.cancel'));
