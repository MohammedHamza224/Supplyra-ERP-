-- Migration: Allow purchases.update to insert and delete purchase_items during invoice editing

DROP POLICY IF EXISTS "Purchase Items Insert" ON public.purchase_items;
CREATE POLICY "Purchase Items Insert" 
ON public.purchase_items 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_permission('purchases.create') OR public.has_permission('purchases.update'));

DROP POLICY IF EXISTS "Purchase Items Delete" ON public.purchase_items;
CREATE POLICY "Purchase Items Delete" 
ON public.purchase_items 
FOR DELETE 
TO authenticated 
USING (public.has_permission('purchases.cancel') OR public.has_permission('purchases.update'));
