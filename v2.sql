select policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'inventory_batches';
