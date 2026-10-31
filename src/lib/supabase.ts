import { createClient } from '@supabase/supabase-js';

// Support VITE_ (standard Vite), SUPABASE_ (Vercel-Supabase integration), and NEXT_PUBLIC_ prefixes
// Fallback directly to the active project so Vercel builds immediately connect even if env variables are pending
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://olkdnqsrhjgoepklkwkk.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_jwf96GqDDz_VUpO4XZN9vQ_9CtLjRvj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
