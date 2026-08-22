SELECT
    u.id AS user_id,
    u.email,
    p.first_name,
    p.last_name,
    p.role_id,
    r.name AS role_name,
    p.active
FROM public.profiles p
LEFT JOIN public.roles r ON r.id = p.role_id
JOIN auth.users u ON u.id = p.id
ORDER BY u.email;
