import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // USE SERVICE ROLE TO DIAGNOSE DATA
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- STARTING DIAGNOSTIC ---');
  console.log(`SUPABASE URL: ${supabaseUrl}`);

  // Warehouses
  const { data: warehouses, error: wError } = await supabase.from('warehouses').select('*');
  console.log('WAREHOUSES TABLE: Rows = ' + (warehouses ? warehouses.length : 0));
  console.log('WAREHOUSES SELECT: ' + (wError ? 'FAIL (' + wError.message + ')' : 'PASS'));

  // Products
  const { data: products, error: pError } = await supabase.from('products').select('*');
  console.log('PRODUCTS TABLE: Rows = ' + (products ? products.length : 0));
  console.log('PRODUCTS SELECT: ' + (pError ? 'FAIL (' + pError.message + ')' : 'PASS'));

  // Inventory Batches
  const { data: batches, error: bError } = await supabase.from('inventory_batches').select('*');
  console.log('INVENTORY_BATCHES: Rows = ' + (batches ? batches.length : 0));
  console.log('INVENTORY SELECT: ' + (bError ? 'FAIL (' + bError.message + ')' : 'PASS'));

  console.log('\n--- ACTIVE FILTERS ---');
  const activeWarehouses = warehouses?.filter(w => w.active === true) || [];
  console.log(`Active Warehouses: ${activeWarehouses.length}`);
  
  const activeProducts = products?.filter(p => p.active === true) || [];
  console.log(`Active Products: ${activeProducts.length}`);

  const activeBatches = batches?.filter(b => b.active === true) || [];
  console.log(`Active Batches: ${activeBatches.length}`);
}

diagnose();
