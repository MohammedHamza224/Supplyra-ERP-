-- Migration 026: Ensure Cashier Role & Seed Demo Accounts in auth.users and profiles
-- Password for all demo accounts: Supplyra@123

DO $$
DECLARE
    v_manager_role UUID;
    v_cashier_role UUID;
    v_sales_role UUID;
    v_warehouse_role UUID;
    v_purchasing_role UUID;

    v_cashier_id UUID := '00000000-0000-0000-0000-000000000021'::UUID;
    v_sales_id UUID := '00000000-0000-0000-0000-000000000022'::UUID;
    v_warehouse_id UUID := '00000000-0000-0000-0000-000000000023'::UUID;
    v_purchasing_id UUID := '00000000-0000-0000-0000-000000000024'::UUID;
BEGIN
    -- 1. Ensure Roles Exist
    INSERT INTO public.roles (name, description)
    VALUES ('Cashier', 'Cashier operations and point of sale')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

    INSERT INTO public.roles (name, description)
    VALUES ('Sales', 'Sales operations and customer management')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO public.roles (name, description)
    VALUES ('Warehouse', 'Inventory and warehouse operations')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO public.roles (name, description)
    VALUES ('Purchasing', 'Supplier and purchase order management')
    ON CONFLICT (name) DO NOTHING;

    -- Get Role IDs
    SELECT id INTO v_manager_role FROM public.roles WHERE name = 'Manager';
    SELECT id INTO v_cashier_role FROM public.roles WHERE name = 'Cashier';
    SELECT id INTO v_sales_role FROM public.roles WHERE name = 'Sales';
    SELECT id INTO v_warehouse_role FROM public.roles WHERE name = 'Warehouse';
    SELECT id INTO v_purchasing_role FROM public.roles WHERE name = 'Purchasing';

    -- 2. Ensure Permissions for Cashier
    INSERT INTO public.permissions (name, description) VALUES
        ('sales.pos', 'Access Point of Sale'),
        ('sales.discount_request', 'Request discounts in POS')
    ON CONFLICT (name) DO NOTHING;

    -- Attach permissions to Cashier role
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_cashier_role, p.id FROM public.permissions p
    WHERE p.name IN ('sales.create', 'sales.view', 'sales.update', 'products.view', 'inventory.view', 'customers.view', 'customers.create', 'sales.pos')
    ON CONFLICT DO NOTHING;

    -- 3. Seed Cashier Account (cashier@supplyra.com)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_cashier_id, '00000000-0000-0000-0000-000000000000',
        'cashier@supplyra.com',
        crypt('Supplyra@123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"سارة","last_name":"الشمري"}',
        NOW(), NOW(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email, 
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (v_cashier_id, 'سارة', 'الشمري', v_cashier_role, true)
    ON CONFLICT (id) DO UPDATE SET first_name = 'سارة', last_name = 'الشمري', role_id = v_cashier_role, active = true;

    -- 4. Seed Sales Account (sales@supplyra.com)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        v_sales_id, '00000000-0000-0000-0000-000000000000',
        'sales@supplyra.com',
        crypt('Supplyra@123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"أحمد","last_name":"المنصور"}',
        NOW(), NOW(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email, 
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (v_sales_id, 'أحمد', 'المنصور', v_sales_role, true)
    ON CONFLICT (id) DO UPDATE SET first_name = 'أحمد', last_name = 'المنصور', role_id = v_sales_role, active = true;

    -- 5. Seed Warehouse Account (warehouse@supplyra.com)
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
    ) ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email, 
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (v_warehouse_id, 'فهد', 'الغامدي', v_warehouse_role, true)
    ON CONFLICT (id) DO UPDATE SET first_name = 'فهد', last_name = 'الغامدي', role_id = v_warehouse_role, active = true;

    -- 6. Seed Purchasing Account (purchasing@supplyra.com)
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
    ) ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email, 
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    INSERT INTO public.profiles (id, first_name, last_name, role_id, active)
    VALUES (v_purchasing_id, 'عبدالله', 'الشهري', v_purchasing_role, true)
    ON CONFLICT (id) DO UPDATE SET first_name = 'عبدالله', last_name = 'الشهري', role_id = v_purchasing_role, active = true;

END;
$$;
