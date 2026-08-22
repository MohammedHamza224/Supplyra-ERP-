-- 1. Check RLS status
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where tablename = 'product_suppliers';

-- 2. Check Policies
select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where tablename = 'product_suppliers';

-- 3. Check Table Grants
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'product_suppliers'
  and grantee in ('authenticated', 'anon')
order by grantee, privilege_type;

-- 4. Check Foreign Keys
select
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'product_suppliers'
  and tc.constraint_type = 'FOREIGN KEY';
