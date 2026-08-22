SELECT
    u.id AS user_id,
    u.email,
    p.first_name,
    p.last_name,
    p.role_id,
    r.name AS role_name,
    p.active
FROM public.profiles p
JOIN public.roles r ON r.id = p.role_id
JOIN auth.users u ON u.id = p.id
WHERE u.email IN (
    'khalid12@gmail.com',
    'khalid123@gmail.com',
    'osama22@gmail.com',
    'mh620039@gmail.com',
    'ahmed@gmail.com'
)
ORDER BY u.email;
