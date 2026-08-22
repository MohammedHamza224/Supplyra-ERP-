const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function trace() {
  console.log('=== WAREHOUSE TRACE START ===');

  // STEP 1 - Get latest product
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, product_code')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (prodErr || !products || products.length === 0) {
    console.log('No products found or error:', prodErr);
    return;
  }
  
  const product = products[0]; // test with the newest product
  console.log('EDIT PRODUCT ID:', product.id);
  console.log('EDIT PRODUCT:', product);

  // STEP 2 - Query inventory_batches
  const { data: batches, error: batchesError } = await supabase
    .from('inventory_batches')
    .select(`
      id,
      product_id,
      warehouse_id,
      quantity,
      remaining_quantity
    `)
    .eq('product_id', product.id);

  console.log('INVENTORY BATCHES:', batches);
  console.log('INVENTORY BATCHES ERROR:', batchesError);

  if (!batches || batches.length === 0) {
    console.log('ROOT CAUSE:\nNo inventory_batches record exists for this product.');
    
    // Let's check all batches just in case it's in another product
    const { data: allBatches } = await supabase.from('inventory_batches').select('product_id, warehouse_id').limit(2);
    console.log('ANY BATCHES IN DB?:', allBatches);
    return;
  }

  // STEP 3 - Check warehouse
  const warehouseId = batches[0].warehouse_id;
  
  const { data: warehouse, error: warehouseError } = await supabase
    .from('warehouses')
    .select('id, name, active')
    .eq('id', warehouseId)
    .maybeSingle();

  console.log('WAREHOUSE FROM DB:', warehouse);
  console.log('WAREHOUSE ERROR:', warehouseError);
}

trace().catch(console.error);
