INSERT INTO public.product_suppliers (product_id, supplier_id, is_preferred)
SELECT p.id, s.id, true
FROM public.products p
CROSS JOIN public.suppliers s
LIMIT 1;

SELECT * FROM public.product_suppliers LIMIT 1;
