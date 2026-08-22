SELECT
  b.id as batch_id,
  b.product_id,
  b.warehouse_id,
  b.quantity,
  b.remaining_quantity
FROM public.inventory_batches b
ORDER BY b.created_at DESC
LIMIT 1;
