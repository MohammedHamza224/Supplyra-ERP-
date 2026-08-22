SELECT 'Categories' as entity, COUNT(*) FROM public.categories
UNION ALL
SELECT 'Brands', COUNT(*) FROM public.brands
UNION ALL
SELECT 'Units', COUNT(*) FROM public.units
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM public.suppliers
UNION ALL
SELECT 'Warehouses', COUNT(*) FROM public.warehouses
UNION ALL
SELECT 'Customers', COUNT(*) FROM public.customers
UNION ALL
SELECT 'Products', COUNT(*) FROM public.products;
