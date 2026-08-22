SELECT count(*) FROM public.role_permissions rp JOIN public.roles r ON rp.role_id = r.id WHERE r.name = 'Manager';
