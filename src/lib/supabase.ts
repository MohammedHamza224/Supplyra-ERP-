import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables. Please check your .env file.");
}

export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co', // Use a dummy valid URL format so client init doesn't crash immediately, but fails on network
  supabaseAnonKey || 'placeholder'
);
