import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  const tables = [
    'products',
    'warehouses',
    'inventory_batches',
    'suppliers',
    'product_suppliers',
    'orders',
    'order_items',
    'customers',
    'payments'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`\n=== Table: ${table} ===`);
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('Exists! Columns/Data sample:');
      console.log(data?.[0] ? Object.keys(data[0]) : 'Empty table');
    }
  }
}

inspectSchema();
