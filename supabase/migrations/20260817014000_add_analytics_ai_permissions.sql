-- Insert new permissions
INSERT INTO public.permissions (name, description) VALUES
('analytics.view', 'View Analytics Dashboard'),
('ai.view', 'Access AI Assistant')
ON CONFLICT (name) DO NOTHING;

-- Map to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Manager' AND p.name IN ('analytics.view', 'ai.view')
ON CONFLICT DO NOTHING;
