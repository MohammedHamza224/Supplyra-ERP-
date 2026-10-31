-- 024_storage_buckets.sql: Supabase Storage Configuration & RLS Policies for Supplyra
-- Buckets: 'public-assets' (Logos, User Avatars, Brand Images) & 'documents' (Invoices, Attachments)

-- 1. Create or update buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('public-assets', 'public-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS Policies for 'public-assets'
DROP POLICY IF EXISTS "Public Assets are viewable by everyone" ON storage.objects;
CREATE POLICY "Public Assets are viewable by everyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload public assets" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "Users can update their own public assets" ON storage.objects;
CREATE POLICY "Users can update their own public assets" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'public-assets' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own public assets" ON storage.objects;
CREATE POLICY "Users can delete their own public assets" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'public-assets' AND auth.uid() = owner);

-- 3. RLS Policies for 'documents'
DROP POLICY IF EXISTS "Authenticated users can view business documents" ON storage.objects;
CREATE POLICY "Authenticated users can view business documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can upload business documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload business documents" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Document owners or managers can delete documents" ON storage.objects;
CREATE POLICY "Document owners or managers can delete documents" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'documents' AND (auth.uid() = owner OR public.has_permission('settings.edit')));
