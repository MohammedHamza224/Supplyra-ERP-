import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const email = `testuser_${Date.now()}@supplyra.com`;
  const { data: auth, error } = await supabase.auth.signUp({ email, password: 'password123' });
  console.log('AUTH RESULT:', auth?.session ? 'HAVE SESSION' : 'NO SESSION', error);
}

runTest();
