-- 1. Fix inventory_batches Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_batches TO authenticated;

-- 2. Ensure Sales Role has appropriate permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Sales'
AND p.name IN (
  'sales.view',
  'sales.create',
  'sales.update',
  'sales.cancel',
  'sales.receive_payment',
  'customers.view',
  'customers.create',
  'customers.update',
  'products.view',
  'warehouses.view'
)
ON CONFLICT DO NOTHING;

-- 3. Ensure Warehouse Role has appropriate permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Warehouse'
AND p.name IN (
  'products.view',
  'warehouses.create',
  'warehouses.deactivate',
  'warehouses.update',
  'warehouses.view'
)
ON CONFLICT DO NOTHING;
