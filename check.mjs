import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve('.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkBatches() {
  const { data, error } = await supabase.rpc('debug_get_all_batches');
  console.log("ERROR:", error);
  console.log("BATCHES:", JSON.stringify(data, null, 2));
}

checkBatches();
