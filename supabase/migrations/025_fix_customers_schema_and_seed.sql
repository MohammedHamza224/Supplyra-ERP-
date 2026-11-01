-- Migration 025: Fix Customers & Customer Locations Schema Compatibility & Seed Demo Customers

-- 1. Ensure all compatibility columns exist in customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'Cash';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 0;

-- Sync mobile and phone if one exists
UPDATE public.customers SET mobile = phone WHERE mobile IS NULL AND phone IS NOT NULL;
UPDATE public.customers SET phone = mobile WHERE phone IS NULL AND mobile IS NOT NULL;

-- 2. Ensure all compatibility columns exist in customer_locations
ALTER TABLE public.customer_locations ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.customer_locations ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE public.customer_locations ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.customer_locations ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.customer_locations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customer_locations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Sync location_name and name
UPDATE public.customer_locations SET location_name = name WHERE location_name IS NULL AND name IS NOT NULL;
UPDATE public.customer_locations SET name = location_name WHERE name IS NULL AND location_name IS NOT NULL;

-- 3. Seed 6 Realistic Saudi Demo Customers
DO $$
DECLARE
    v_c1 UUID;
    v_c2 UUID;
    v_c3 UUID;
    v_c4 UUID;
    v_c5 UUID;
    v_c6 UUID;
BEGIN
    -- Customer 1: شركة أسواق العثيم
    INSERT INTO public.customers (name, phone, mobile, address, tax_number, payment_terms, payment_type, credit_limit, active, notes)
    VALUES ('شركة أسواق العثيم', '0551234567', '0551234567', 'الرياض - حي الربوة - طريق خريص', '300123456700003', 30, 'Credit', 50000, true, 'عميل تجريبي - سوبرماركت وسلسلة تجزئة')
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_c1;

    IF v_c1 IS NULL THEN
        SELECT id INTO v_c1 FROM public.customers WHERE name = 'شركة أسواق العثيم' LIMIT 1;
    END IF;

    IF v_c1 IS NOT NULL THEN
        INSERT INTO public.customer_locations (customer_id, name, location_name, address, city, latitude, longitude, google_maps_url, is_primary, active)
        VALUES (v_c1, 'الفرع الرئيسي - الرياض', 'الفرع الرئيسي - الرياض', 'طريق خريص، حي الربوة، الرياض', 'الرياض', 24.71360000, 46.67530000, 'https://www.google.com/maps/search/?api=1&query=24.7136,46.6753', true, true)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Customer 2: شركة بنده للتجزئة
    INSERT INTO public.customers (name, phone, mobile, address, tax_number, payment_terms, payment_type, credit_limit, active, notes)
    VALUES ('شركة بنده للتجزئة', '0552345678', '0552345678', 'جدة - حي الرويس - طريق الأندلس', '300234567800003', 45, 'Credit', 75000, true, 'عميل تجريبي - هايبرماركت وتجزئة')
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_c2;

    IF v_c2 IS NULL THEN
        SELECT id INTO v_c2 FROM public.customers WHERE name = 'شركة بنده للتجزئة' LIMIT 1;
    END IF;

    IF v_c2 IS NOT NULL THEN
        INSERT INTO public.customer_locations (customer_id, name, location_name, address, city, latitude, longitude, google_maps_url, is_primary, active)
        VALUES (v_c2, 'فرع الأندلس - جدة', 'فرع الأندلس - جدة', 'طريق الأندلس، جدة', 'جدة', 21.54330000, 39.17280000, 'https://www.google.com/maps/search/?api=1&query=21.5433,39.1728', true, true)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Customer 3: تموينات الدانوب
    INSERT INTO public.customers (name, phone, mobile, address, tax_number, payment_terms, payment_type, credit_limit, active, notes)
    VALUES ('تموينات الدانوب', '0553456789', '0553456789', 'الرياض - طريق الملك عبد العزيز', '300345678900003', 0, 'Cash', 20000, true, 'عميل تجريبي - فرع تموينات راقية')
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_c3;

    IF v_c3 IS NULL THEN
        SELECT id INTO v_c3 FROM public.customers WHERE name = 'تموينات الدانوب' LIMIT 1;
    END IF;

    IF v_c3 IS NOT NULL THEN
        INSERT INTO public.customer_locations (customer_id, name, location_name, address, city, latitude, longitude, google_maps_url, is_primary, active)
        VALUES (v_c3, 'فرع التخصصي - الرياض', 'فرع التخصصي - الرياض', 'طريق التخصصي، الرياض', 'الرياض', 24.70110000, 46.66120000, 'https://www.google.com/maps/search/?api=1&query=24.7011,46.6612', true, true)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Customer 4: أسواق التميمي
    INSERT INTO public.customers (name, phone, mobile, address, tax_number, payment_terms, payment_type, credit_limit, active, notes)
    VALUES ('أسواق التميمي', '0554567890', '0554567890', 'الخبر - حي الحزام الذهبي', '300456789000003', 30, 'Credit', 60000, true, 'عميل تجريبي - أسواق المنطقة الشرقية')
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_c4;

    IF v_c4 IS NULL THEN
        SELECT id INTO v_c4 FROM public.customers WHERE name = 'أسواق التميمي' LIMIT 1;
    END IF;

    IF v_c4 IS NOT NULL THEN
        INSERT INTO public.customer_locations (customer_id, name, location_name, address, city, latitude, longitude, google_maps_url, is_primary, active)
        VALUES (v_c4, 'فرع الخبر الرئيسي', 'فرع الخبر الرئيسي', 'طريق الأمير فيصل بن فهد، الخبر', 'الخبر', 26.28860000, 50.20840000, 'https://www.google.com/maps/search/?api=1&query=26.2886,50.2084', true, true)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Customer 5: مؤسسة الوفاء للتوزيع الغذائي
    INSERT INTO public.customers (name, phone, mobile, address, tax_number, payment_terms, payment_type, credit_limit, active, notes)
    VALUES ('مؤسسة الوفاء للتوزيع الغذائي', '0555678901', '0555678901', 'الدمام - حي الشاطئ', '300567890100003', 0, 'Cash', 15000, true, 'عميل تجريبي - موزع ومطاعم')
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_c5;

    IF v_c5 IS NULL THEN
        SELECT id INTO v_c5 FROM public.customers WHERE name = 'مؤسسة الوفاء للتوزيع الغذائي' LIMIT 1;
    END IF;

    IF v_c5 IS NOT NULL THEN
        INSERT INTO public.customer_locations (customer_id, name, location_name, address, city, latitude, longitude, google_maps_url, is_primary, active)
        VALUES (v_c5, 'مستودع التوزيع - الدمام', 'مستودع التوزيع - الدمام', 'طريق الملك فهد، الدمام', 'الدمام', 26.42070000, 50.08880000, 'https://www.google.com/maps/search/?api=1&query=26.4207,50.0888', true, true)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Customer 6: سوبرماركت كارفور
    INSERT INTO public.customers (name, phone, mobile, address, tax_number, payment_terms, payment_type, credit_limit, active, notes)
    VALUES ('سوبرماركت كارفور', '0556789012', '0556789012', 'الرياض - النخيل مول', '300678901200003', 60, 'Credit', 90000, true, 'عميل تجريبي - مركز تجاري كبير')
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_c6;

    IF v_c6 IS NULL THEN
        SELECT id INTO v_c6 FROM public.customers WHERE name = 'سوبرماركت كارفور' LIMIT 1;
    END IF;

    IF v_c6 IS NOT NULL THEN
        INSERT INTO public.customer_locations (customer_id, name, location_name, address, city, latitude, longitude, google_maps_url, is_primary, active)
        VALUES (v_c6, 'فرع النخيل - الرياض', 'فرع النخيل - الرياض', 'مخرج 9، الرياض', 'الرياض', 24.76750000, 46.71530000, 'https://www.google.com/maps/search/?api=1&query=24.7675,46.7153', true, true)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

-- 4. Ensure all compatibility columns exist in warehouses
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS phone TEXT;

-- 5. Seed 2 Realistic Demo Warehouses (Riyadh & Jeddah)
INSERT INTO public.warehouses (code, name, location, active, notes)
VALUES 
  ('MAIN', 'المستودع الرئيسي - الرياض', 'الرياض - المنطقة الصناعية الثانية - طريق الخرج', true, 'المستودع المركزي لتوزيع المواد الغذائية الجافة والمبردة'),
  ('JED-01', 'مستودع فرع الغربية - جدة', 'جدة - الخمرة - مستودعات التوزيع', true, 'مستودع توزيع المنطقة الغربية')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, location = EXCLUDED.location, active = true;

-- 6. Seed Demo Team Users (Sales, Warehouse, Purchasing)
DO $$
DECLARE
    v_sales_role UUID;
    v_warehouse_role UUID;
    v_purchasing_role UUID;
    
    v_sales_id UUID := '11111111-1111-1111-1111-111111111111';
    v_warehouse_id UUID := '22222222-2222-2222-2222-222222222222';
    v_purchasing_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
    SELECT id INTO v_sales_role FROM public.roles WHERE name = 'Sales';
    SELECT id INTO v_warehouse_role FROM public.roles WHERE name = 'Warehouse';
    SELECT id INTO v_purchasing_role FROM public.roles WHERE name = 'Purchasing';

    -- 1. Sales: sales@supplyra.com (Pass: Supplyra@123)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_sales_id, '00000000-0000-0000-0000-000000000000',
        'sales@supplyra.com',
        crypt('Supplyra@123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"خالد","last_name":"العتيبي"}',
        NOW(), NOW(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (v_sales_id, 'خالد', 'العتيبي', v_sales_role, true)
    ON CONFLICT (id) DO UPDATE SET role_id = v_sales_role, active = true;

    -- 2. Warehouse: warehouse@supplyra.com (Pass: Supplyra@123)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_warehouse_id, '00000000-0000-0000-0000-000000000000',
        'warehouse@supplyra.com',
        crypt('Supplyra@123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"فهد","last_name":"الغامدي"}',
        NOW(), NOW(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (v_warehouse_id, 'فهد', 'الغامدي', v_warehouse_role, true)
    ON CONFLICT (id) DO UPDATE SET role_id = v_warehouse_role, active = true;

    -- 3. Purchasing: purchasing@supplyra.com (Pass: Supplyra@123)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_purchasing_id, '00000000-0000-0000-0000-000000000000',
        'purchasing@supplyra.com',
        crypt('Supplyra@123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"عبدالله","last_name":"الشهري"}',
        NOW(), NOW(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (v_purchasing_id, 'عبدالله', 'الشهري', v_purchasing_role, true)
    ON CONFLICT (id) DO UPDATE SET role_id = v_purchasing_role, active = true;
END;
$$;

