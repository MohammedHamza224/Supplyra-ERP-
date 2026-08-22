-- Migration 025: Fix Brands Permissions for Dynamic Creation
-- Grant INSERT and UPDATE privileges to authenticated users on the brands table
GRANT INSERT, UPDATE ON public.brands TO authenticated;

-- Create policies that allow authenticated users with product creation/update permissions 
-- to create or update brands on the fly.
CREATE POLICY "Brands Insert" ON public.brands 
FOR INSERT TO authenticated 
WITH CHECK (
    public.has_permission('products.create') OR 
    public.has_permission('products.update')
);

CREATE POLICY "Brands Update" ON public.brands 
FOR UPDATE TO authenticated 
USING (
    public.has_permission('products.create') OR 
    public.has_permission('products.update')
);
