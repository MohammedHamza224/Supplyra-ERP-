import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('Starting E2E Test...');
  
  // 1. Sign up a new user
  const email = `testuser_${Date.now()}@supplyra.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123',
  });
  
  if (authError) {
    console.error('Sign up failed:', authError);
    // If it fails, maybe we can login with the seed admin?
    // Let's just try to login as admin@supplyra.com
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@supplyra.com',
      password: 'password123'
    });
    if (loginError) {
      console.error('Login failed:', loginError);
      return;
    }
    console.log('Logged in as admin');
  } else {
    console.log('Signed up and logged in as', email);
  }

  // 2. Create Warehouse
  const { data: wh, error: whError } = await supabase.from('warehouses').insert([{
    name: 'Main Warehouse Test',
    code: `MW-${Date.now()}`
  }]).select('*').single();
  
  if (whError) {
    console.error('Warehouse insert failed:', whError);
    return;
  }
  console.log('Created Warehouse:', wh.id);

  // 3. Create Product
  const { data: prod, error: prodError } = await supabase.from('products').insert([{
    product_code: `P-${Date.now()}`,
    name: 'Test Milk',
    purchase_price: 200,
    selling_price: 250,
    min_stock: 10,
    active: true
  }]).select('*').single();
  
  if (prodError) {
    console.error('Product insert failed:', prodError);
    return;
  }
  console.log('Created Product:', prod.id);

  // 4. Create Batch
  const batchData = {
    product_id: prod.id,
    warehouse_id: wh.id,
    batch_number: '0022',
    production_date: '2026-12-08',
    expiry_date: '2026-12-08',
    quantity: 600
  };
  const { data: batch, error: batchError } = await supabase.from('inventory_batches').insert([batchData]).select('*');
  
  if (batchError) {
    console.error('Batch insert failed:', batchError);
  } else {
    console.log('Created Batch successfully:', batch);
  }

  // 5. Query Batch using exactly the InventoryList.tsx logic
  let query = supabase
    .from('inventory_batches')
    .select(`
      *,
      products(name, product_code, purchase_price),
      warehouses(name)
    `)
    .eq('product_id', prod.id)
    .order('expiry_date', { ascending: true });

  const { data: fetchedBatches, error: fetchError } = await query;
  
  if (fetchError) {
    console.error('Fetch Batches failed:', fetchError);
  } else {
    console.log('Fetched Batches:', JSON.stringify(fetchedBatches, null, 2));
  }
}

runTest();
