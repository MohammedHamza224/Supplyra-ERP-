require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectWarehouses() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: 'admin@supplyra.com', password: 'admin123' });
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  const { data: warehouses, error: wError } = await supabase.from('warehouses').select('*');
  if (wError) {
    console.error('Error fetching warehouses:', wError);
    return;
  }

  console.log('--- WAREHOUSES ---');
  for (const w of warehouses) {
    console.log(`ID: ${w.id} | Name: ${w.name} | Active: ${w.active}`);
    
    const { count: inventoryCount } = await supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id);
    const { count: purchasesCount } = await supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id);
    const { count: ordersCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('warehouse_id', w.id);
    
    console.log(`  Batches: ${inventoryCount} | Purchases: ${purchasesCount} | Orders: ${ordersCount}`);
  }
}
inspectWarehouses();
