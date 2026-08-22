-- 1. Get Roles
SELECT * FROM public.roles;

-- 2. Get Permissions
SELECT * FROM public.permissions ORDER BY name;

-- 3. Get Role Permissions count per role
SELECT r.name as role_name, COUNT(rp.permission_id) as permissions_count
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
GROUP BY r.name;
