SELECT 'WAREHOUSES' as table_name, COUNT(*) as row_count, COUNT(*) FILTER (WHERE active = true) as active_count FROM public.warehouses
UNION ALL
SELECT 'PRODUCTS' as table_name, COUNT(*) as row_count, COUNT(*) FILTER (WHERE active = true) as active_count FROM public.products
UNION ALL
SELECT 'INVENTORY_BATCHES' as table_name, COUNT(*) as row_count, COUNT(*) FILTER (WHERE active = true) as active_count FROM public.inventory_batches
UNION ALL
SELECT 'SUPPLIERS' as table_name, COUNT(*) as row_count, COUNT(*) FILTER (WHERE active = true) as active_count FROM public.suppliers;

SELECT id, name, active FROM public.warehouses LIMIT 5;
SELECT id, name, active FROM public.products LIMIT 5;
SELECT id, product_id, warehouse_id, quantity, active FROM public.inventory_batches LIMIT 5;
