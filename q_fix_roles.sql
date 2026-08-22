-- Update Khalid to Purchasing
UPDATE public.profiles
SET role_id = '2ea05d26-99d0-4ecb-81a4-367b9fc89b5e'
WHERE id = '386378e8-5753-4518-bc40-d2a7be75b4fb';

-- Insert Osama if not exists
INSERT INTO public.profiles (id, first_name, last_name, role_id, active, created_at, updated_at)
VALUES (
    '898b0f2b-e701-4436-8def-62c99e53ffa1', 
    'Osama', 
    'Ali', 
    '66c312f6-23ee-4f08-bffc-35f6db6797b4', 
    true, 
    now(), 
    now()
)
ON CONFLICT (id) DO UPDATE
SET role_id = EXCLUDED.role_id;
