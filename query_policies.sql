SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items', 'order_item_batches', 'payments');
