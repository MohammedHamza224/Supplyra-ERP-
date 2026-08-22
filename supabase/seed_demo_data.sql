-- ==========================================
-- SUPPLYRA DEMO DATA SEED SCRIPT
-- Safely inserts foundational demo data
-- Idempotent: Uses ON CONFLICT DO NOTHING or WHERE NOT EXISTS
-- ==========================================

-- 1. CATEGORIES (name is UNIQUE)
INSERT INTO public.categories (name, description, active) VALUES
  ('مواد غذائية', 'Demo Category', true),
  ('مشروبات', 'Demo Category', true),
  ('ألبان', 'Demo Category', true),
  ('معلبات', 'Demo Category', true),
  ('منظفات', 'Demo Category', true),
  ('منتجات ورقية', 'Demo Category', true)
ON CONFLICT (name) DO NOTHING;

-- 2. BRANDS (name is UNIQUE)
INSERT INTO public.brands (name, active) VALUES
  ('Almarai', true),
  ('Nadec', true),
  ('Americana', true),
  ('Nestlé', true),
  ('Pepsi', true),
  ('Coca-Cola', true),
  ('Sunbulah', true)
ON CONFLICT (name) DO NOTHING;

-- 3. UNITS (code is UNIQUE)
INSERT INTO public.units (name, code, active) VALUES
  ('Piece', 'PCS', true),
  ('Carton', 'CTN', true),
  ('Kilogram', 'KG', true),
  ('Liter', 'LTR', true),
  ('Pack', 'PCK', true)
ON CONFLICT (code) DO NOTHING;

-- 4. SUPPLIERS (name is UNIQUE)
INSERT INTO public.suppliers (name, contact_person, phone, email, notes, active) VALUES
  ('شركة الإمداد الغذائي', 'أحمد محمد', '0500000001', 'supplier1@demo.local', 'DEMO', true),
  ('مؤسسة الوفرة التجارية', 'خالد عبدالله', '0500000002', 'supplier2@demo.local', 'DEMO', true),
  ('شركة النخبة للتوزيع', 'محمد علي', '0500000003', 'supplier3@demo.local', 'DEMO', true),
  ('شركة الخليج للمواد الغذائية', 'إبراهيم حسن', '0500000004', 'supplier4@demo.local', 'DEMO', true)
ON CONFLICT (name) DO NOTHING;

-- 5. WAREHOUSES (code is UNIQUE)
INSERT INTO public.warehouses (code, name, location, notes, active) VALUES
  ('MAIN', 'المستودع الرئيسي', 'المركز الرئيسي', 'DEMO', true),
  ('BR-01', 'مستودع الفرع', 'الفرع الأول', 'DEMO', true)
ON CONFLICT (code) DO NOTHING;

-- 6. CUSTOMERS (name is not unique, so we use INSERT ... SELECT WHERE NOT EXISTS)
INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'سوبر ماركت النخبة', '0550000001', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'سوبر ماركت النخبة');

INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'أسواق الخير', '0550000002', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'أسواق الخير');

INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'تموينات الواحة', '0550000003', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'تموينات الواحة');

INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'سوبر ماركت الروضة', '0550000004', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'سوبر ماركت الروضة');

INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'أسواق المدينة', '0550000005', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'أسواق المدينة');

INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'تموينات الصفوة', '0550000006', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'تموينات الصفوة');

INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'سوبر ماركت المروج', '0550000007', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'سوبر ماركت المروج');

INSERT INTO public.customers (name, mobile, payment_type, notes, active)
SELECT 'أسواق البركة', '0550000008', 'Cash', 'DEMO', true
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'أسواق البركة');

-- 7. PRODUCTS (product_code is UNIQUE)
DO $$
DECLARE
    v_cat_food UUID;
    v_cat_drink UUID;
    v_cat_dairy UUID;
    v_cat_can UUID;
    v_cat_clean UUID;
    v_cat_paper UUID;
    
    v_br_almarai UUID;
    v_br_nadec UUID;
    v_br_americana UUID;
    v_br_nestle UUID;
    v_br_pepsi UUID;
    v_br_coca UUID;
    v_br_sunbulah UUID;
    
    v_un_kg UUID;
    v_un_ltr UUID;
    v_un_pcs UUID;
    v_un_pck UUID;
    v_un_ctn UUID;
BEGIN
    -- Fetch Categories
    SELECT id INTO v_cat_food FROM public.categories WHERE name = 'مواد غذائية' LIMIT 1;
    SELECT id INTO v_cat_drink FROM public.categories WHERE name = 'مشروبات' LIMIT 1;
    SELECT id INTO v_cat_dairy FROM public.categories WHERE name = 'ألبان' LIMIT 1;
    SELECT id INTO v_cat_can FROM public.categories WHERE name = 'معلبات' LIMIT 1;
    SELECT id INTO v_cat_clean FROM public.categories WHERE name = 'منظفات' LIMIT 1;
    SELECT id INTO v_cat_paper FROM public.categories WHERE name = 'منتجات ورقية' LIMIT 1;

    -- Fetch Brands
    SELECT id INTO v_br_almarai FROM public.brands WHERE name = 'Almarai' LIMIT 1;
    SELECT id INTO v_br_nadec FROM public.brands WHERE name = 'Nadec' LIMIT 1;
    SELECT id INTO v_br_americana FROM public.brands WHERE name = 'Americana' LIMIT 1;
    SELECT id INTO v_br_nestle FROM public.brands WHERE name = 'Nestlé' LIMIT 1;
    SELECT id INTO v_br_pepsi FROM public.brands WHERE name = 'Pepsi' LIMIT 1;
    SELECT id INTO v_br_coca FROM public.brands WHERE name = 'Coca-Cola' LIMIT 1;
    SELECT id INTO v_br_sunbulah FROM public.brands WHERE name = 'Sunbulah' LIMIT 1;

    -- Fetch Units
    SELECT id INTO v_un_kg FROM public.units WHERE code = 'KG' LIMIT 1;
    SELECT id INTO v_un_ltr FROM public.units WHERE code = 'LTR' LIMIT 1;
    SELECT id INTO v_un_pcs FROM public.units WHERE code = 'PCS' LIMIT 1;
    SELECT id INTO v_un_pck FROM public.units WHERE code = 'PCK' LIMIT 1;
    SELECT id INTO v_un_ctn FROM public.units WHERE code = 'CTN' LIMIT 1;

    -- Insert Products safely
    INSERT INTO public.products (product_code, name, category_id, brand_id, unit_id, purchase_price, selling_price, min_stock, active)
    VALUES
      ('DEMO-PRD-01', 'أرز بسمتي 5 كجم', v_cat_food, NULL, v_un_kg, 30.00, 38.00, 50, true),
      ('DEMO-PRD-02', 'سكر أبيض 2 كجم', v_cat_food, NULL, v_un_kg, 7.50, 9.50, 100, true),
      ('DEMO-PRD-03', 'زيت دوار الشمس 1.5 لتر', v_cat_food, NULL, v_un_ltr, 14.00, 17.50, 60, true),
      ('DEMO-PRD-04', 'مكرونة 400 جم', v_cat_food, NULL, v_un_pcs, 2.50, 3.50, 200, true),
      ('DEMO-PRD-05', 'حليب كامل الدسم 1 لتر', v_cat_dairy, v_br_almarai, v_un_ltr, 4.50, 5.50, 150, true),
      ('DEMO-PRD-06', 'مياه معدنية 1.5 لتر', v_cat_drink, v_br_nestle, v_un_ltr, 1.20, 2.00, 300, true),
      ('DEMO-PRD-07', 'عصير برتقال 1 لتر', v_cat_drink, v_br_nadec, v_un_ltr, 6.00, 8.00, 100, true),
      ('DEMO-PRD-08', 'تونة قطع 185 جم', v_cat_can, NULL, v_un_pcs, 4.00, 5.50, 150, true),
      ('DEMO-PRD-09', 'مسحوق غسيل 2 كجم', v_cat_clean, NULL, v_un_kg, 18.00, 23.00, 40, true),
      ('DEMO-PRD-10', 'مناديل ورقية 200 منديل', v_cat_paper, NULL, v_un_pck, 2.20, 3.00, 100, true)
    ON CONFLICT (product_code) DO NOTHING;

END $$;
