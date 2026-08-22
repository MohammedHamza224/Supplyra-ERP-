import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.vercel.app') || 
    origin.endsWith('.netlify.app')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Verify the requesting user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Verify the requesting user has the 'users.create' permission
    const { data: hasPermission, error: permError } = await adminClient.rpc('has_permission', {
      permission_name: 'users.create',
    });

    // We must invoke has_permission on behalf of the caller, but adminClient bypasses RLS.
    // Wait, adminClient's RPC runs as postgres, but `auth.uid()` will be null.
    // Instead of using adminClient for this RPC, we must use a client created with the user's JWT!
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: permissionCheck, error: checkError } = await userClient.rpc('has_permission', {
      permission_name: 'users.create',
    });

    if (checkError || !permissionCheck) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing users.create permission' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Extract body
    const { email, firstName, lastName, roleId, active } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Create the user using admin API (invite)
    // Pass role_id and active directly into raw_user_meta_data so the Postgres trigger handles it atomically
    const { data: newUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        role_id: roleId || null,
        active: active !== undefined ? active : true,
      },
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
