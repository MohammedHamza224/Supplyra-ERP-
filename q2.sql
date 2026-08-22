select policyname, permissive, roles, cmd, qual, with_check from pg_policies where tablename = 'product_suppliers';
