SELECT p.id, r.name as role_name, COUNT(rp.permission_id) as permissions_count
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  LEFT JOIN public.role_permissions rp ON p.role_id = rp.role_id
  GROUP BY p.id, r.name;
