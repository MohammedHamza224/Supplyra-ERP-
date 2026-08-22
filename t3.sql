SELECT w.id, w.name, w.active
FROM public.warehouses w
WHERE w.id = (SELECT warehouse_id FROM public.inventory_batches ORDER BY created_at DESC LIMIT 1);
