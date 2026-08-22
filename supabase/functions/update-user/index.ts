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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
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

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: updatePerm, error: updatePermErr } = await userClient.rpc('has_permission', { permission_name: 'users.update' });
    const { data: assignPerm, error: assignPermErr } = await userClient.rpc('has_permission', { permission_name: 'users.assign_role' });
    const { data: activatePerm, error: activatePermErr } = await userClient.rpc('has_permission', { permission_name: 'users.activate' });

    if (updatePermErr) throw updatePermErr;
    if (assignPermErr) throw assignPermErr;
    if (activatePermErr) throw activatePermErr;

    const { userId, email, firstName, lastName, roleId, active } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update Email using Auth Admin API if changed
    if (email) {
       // Requires users.update or users.create... Assuming users.update is enough
       if (!updatePerm) {
         return new Response(JSON.stringify({ error: 'Unauthorized: Missing users.update permission' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
       }
       const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, { email });
       if (updateAuthError) {
         return new Response(JSON.stringify({ error: updateAuthError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
       }
    }

    // Construct profile updates
    const profileUpdates: any = {};
    if (firstName !== undefined) profileUpdates.first_name = firstName;
    if (lastName !== undefined) profileUpdates.last_name = lastName;
    
    if (roleId !== undefined) {
      if (!assignPerm) {
         return new Response(JSON.stringify({ error: 'Unauthorized: Missing users.assign_role permission' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
      profileUpdates.role_id = roleId || null;
    }

    if (active !== undefined) {
      if (!activatePerm) {
         return new Response(JSON.stringify({ error: 'Unauthorized: Missing users.activate permission' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
      profileUpdates.active = active;
    }

    // Update Profile
    if (Object.keys(profileUpdates).length > 0) {
      if (!updatePerm && (firstName !== undefined || lastName !== undefined)) {
         return new Response(JSON.stringify({ error: 'Unauthorized: Missing users.update permission' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      const { error: profileError } = await adminClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
