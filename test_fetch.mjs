import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ccvitwiriprmhzmwjivr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aBdtc9DibvRkZ2QmKVMxFg_MZK_FRpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('inventory_batches')
    .select(`
      *,
      products!inner(name, product_code, purchase_price),
      warehouses!inner(name)
    `);
  console.log("Error:", error);
}
test();
