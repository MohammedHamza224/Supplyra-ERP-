select schemaname, tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'inventory_batches';
