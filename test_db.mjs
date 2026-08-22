import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ccvitwiriprmhzmwjivr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aBdtc9DibvRkZ2QmKVMxFg_MZK_FRpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@supplyra.com', // Let's try standard credentials or just read as anon if RLS allows? Wait, RLS blocked anon.
    password: 'password'
  });
  console.log("Auth:", authError);

  const { data, error } = await supabase
    .from('inventory_batches')
    .select('*');
  console.log("Batches:", data?.length, error);
}
test();
