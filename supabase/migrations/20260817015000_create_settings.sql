-- Create business_settings table
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'Supplyra Inc.',
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'SAR',
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    logo_url TEXT,
    default_discount_limit DECIMAL(5,2) DEFAULT 5.00,
    invoice_format VARCHAR(50) DEFAULT 'INV-YYYY-MM-SEQ',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row if not exists
INSERT INTO public.business_settings (company_name, phone, email, address)
SELECT 'Supplyra Inc.', '+966 50 000 0000', 'contact@supplyra.com', 'Riyadh, Saudi Arabia'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- Permissions
INSERT INTO public.permissions (name, description) VALUES
('settings.view', 'View Settings'),
('settings.update', 'Update Settings')
ON CONFLICT (name) DO NOTHING;

-- Map to Manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Manager' AND p.name IN ('settings.view', 'settings.update')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: any authenticated user can view business settings (so the app can load currency, timezone, etc.)
CREATE POLICY "Anyone can view business settings"
    ON public.business_settings FOR SELECT
    TO authenticated
    USING (true);

-- Update policy: only Managers can update (based on role check)
CREATE POLICY "Managers can update business settings"
    ON public.business_settings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name = 'Manager'
        )
    );
