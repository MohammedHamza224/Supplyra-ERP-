-- Migration 023: Sales Discount Approvals Workflow

-- 1. Add new permission
INSERT INTO public.permissions (name, description) VALUES
    ('sales.discount.approve', 'Approve discounts over 5%')
ON CONFLICT (name) DO NOTHING;

-- Grant to Admin and Manager roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'Manager')
  AND p.name = 'sales.discount.approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. Add approval status to orders
ALTER TABLE public.orders 
ADD COLUMN discount_approval_status TEXT NOT NULL DEFAULT 'NONE' 
CHECK (discount_approval_status IN ('NONE', 'PENDING', 'APPROVED', 'REJECTED'));

-- 3. Create discount_approvals table
CREATE TABLE public.discount_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discount_percentage NUMERIC(5,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- Protect audit trail
ALTER TABLE public.discount_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View discount approvals" ON public.discount_approvals
    FOR SELECT TO authenticated
    USING (public.has_permission('sales.view'));

CREATE POLICY "Insert discount approvals" ON public.discount_approvals
    FOR INSERT TO authenticated
    WITH CHECK (public.has_permission('sales.create') AND requested_by = auth.uid());

CREATE POLICY "Update discount approvals" ON public.discount_approvals
    FOR UPDATE TO authenticated
    USING (public.has_permission('sales.discount.approve') OR requested_by = auth.uid())
    WITH CHECK (
        public.has_permission('sales.discount.approve') OR 
        (requested_by = auth.uid() AND status = 'PENDING')
    );

GRANT SELECT, INSERT, UPDATE ON public.discount_approvals TO authenticated;

-- 4. Secure RPC Functions for Approval / Rejection
CREATE OR REPLACE FUNCTION public.approve_discount(
    p_approval_id UUID
) RETURNS VOID AS $$
DECLARE
    v_approval RECORD;
    v_order_status TEXT;
BEGIN
    -- Check permissions
    IF NOT public.has_permission('sales.discount.approve') THEN
        RAISE EXCEPTION 'Permission denied. Requires sales.discount.approve.';
    END IF;

    -- Get approval record
    SELECT * INTO v_approval FROM public.discount_approvals WHERE id = p_approval_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found.';
    END IF;

    IF v_approval.status != 'PENDING' THEN
        RAISE EXCEPTION 'Approval request is not in PENDING state.';
    END IF;

    -- Enforce: requester != approver
    IF v_approval.requested_by = auth.uid() THEN
        RAISE EXCEPTION 'You cannot approve your own discount request.';
    END IF;

    -- Approve
    UPDATE public.discount_approvals
    SET status = 'APPROVED',
        approved_by = auth.uid(),
        approved_at = NOW()
    WHERE id = p_approval_id;

    UPDATE public.orders
    SET discount_approval_status = 'APPROVED'
    WHERE id = v_approval.order_id;

    -- Now confirm the sale since the discount is approved
    -- We assume the order was saved but not confirmed.
    -- Calling the existing confirm_sale function if the order is still PENDING.
    SELECT status INTO v_order_status FROM public.orders WHERE id = v_approval.order_id;
    IF v_order_status = 'PENDING' THEN
        PERFORM public.confirm_sale(v_approval.order_id, auth.uid());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.approve_discount(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_discount(
    p_approval_id UUID,
    p_rejection_reason TEXT
) RETURNS VOID AS $$
DECLARE
    v_approval RECORD;
BEGIN
    -- Check permissions
    IF NOT public.has_permission('sales.discount.approve') THEN
        RAISE EXCEPTION 'Permission denied. Requires sales.discount.approve.';
    END IF;

    -- Get approval record
    SELECT * INTO v_approval FROM public.discount_approvals WHERE id = p_approval_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found.';
    END IF;

    IF v_approval.status != 'PENDING' THEN
        RAISE EXCEPTION 'Approval request is not in PENDING state.';
    END IF;

    -- Enforce: requester != approver (Optional for rejection, but good practice)
    IF v_approval.requested_by = auth.uid() THEN
        RAISE EXCEPTION 'You cannot reject your own discount request.';
    END IF;

    IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
        RAISE EXCEPTION 'Rejection reason is required.';
    END IF;

    -- Reject
    UPDATE public.discount_approvals
    SET status = 'REJECTED',
        approved_by = auth.uid(),
        approved_at = NOW(),
        rejection_reason = p_rejection_reason
    WHERE id = p_approval_id;

    UPDATE public.orders
    SET discount_approval_status = 'REJECTED'
    WHERE id = v_approval.order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_discount(UUID, TEXT) TO authenticated;

-- 5. Trigger to invalidate old approvals on edit (Rule 16)
CREATE OR REPLACE FUNCTION public.invalidate_discount_approval_on_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if discount or subtotal has changed
    IF NEW.discount != OLD.discount OR NEW.subtotal != OLD.subtotal THEN
        -- If old status was PENDING or APPROVED, we might need to invalidate
        IF OLD.discount_approval_status IN ('PENDING', 'APPROVED') THEN
            -- Is new discount > 5%?
            IF NEW.subtotal > 0 AND (NEW.discount / NEW.subtotal) > 0.05 THEN
                NEW.discount_approval_status := 'PENDING';
                -- Optionally, we could automatically cancel the old PENDING approval record here,
                -- but frontend should create a new one anyway.
            ELSE
                NEW.discount_approval_status := 'NONE';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_discount_approval
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_discount_approval_on_edit();
