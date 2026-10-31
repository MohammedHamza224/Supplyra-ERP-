import { createClient } from '@supabase/supabase-js';

// Support VITE_ (standard Vite), SUPABASE_ (Vercel-Supabase integration), and NEXT_PUBLIC_ prefixes
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables. Please check your Vercel or local .env configuration.");
}

export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co',
  supabaseAnonKey || 'placeholder'
);
