-- 1. Check existing products
SELECT id, name, product_code FROM public.products ORDER BY created_at DESC LIMIT 3;

-- 2. For the first product, check if there are inventory_batches
SELECT
  b.id as batch_id,
  b.product_id,
  b.warehouse_id,
  b.quantity,
  b.remaining_quantity
FROM public.inventory_batches b
ORDER BY b.created_at DESC
LIMIT 5;

-- 3. Check warehouse details for those batches
SELECT w.id, w.name, w.active
FROM public.warehouses w
WHERE w.id IN (SELECT warehouse_id FROM public.inventory_batches ORDER BY created_at DESC LIMIT 5);
