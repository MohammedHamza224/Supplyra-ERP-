import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string | null;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roleName: string | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const clearRBACState = () => {
    setProfile(null);
    setRoleName(null);
    setPermissions([]);
  };

  const fetchRBACData = async (userId: string) => {
    try {
      // Clear old state before loading new to prevent stale data
      clearRBACState();

      // 1. Fetch Profile safely
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role_id, active')
        .eq('id', userId)
        .maybeSingle();
        
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      
      if (profileData) {
        console.log('PROFILE: FOUND');
        setProfile(profileData);
      } else {
        console.log('PROFILE: NOT FOUND');
        setProfile(null);
      }

      // 2. Fetch Role Name securely via RPC
      const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');
      if (roleError) {
        console.error('Error fetching role via RPC:', roleError);
        setRoleName(null);
      } else {
        console.log(`ROLE: ${roleData || 'NONE'}`);
        setRoleName(roleData);
      }

      // 3. Fetch list of permissions securely via RPC
      const { data: permsData, error: permsError } = await supabase.rpc('get_my_permissions');
      if (permsError) {
        console.error('Error fetching permissions via RPC:', permsError);
        setPermissions([]);
      } else if (permsData) {
        // Safely normalize RPC response
        let normalizedPerms: string[] = [];
        if (Array.isArray(permsData)) {
          normalizedPerms = permsData.map((p: any) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') {
              return p.permission_name || p.name || '';
            }
            return '';
          }).filter(Boolean);
        }
        
        console.log(`PERMISSIONS COUNT: ${normalizedPerms.length}`);
        setPermissions(normalizedPerms);
      }
    } catch (error) {
      console.error('Unexpected error in fetchRBACData:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('AUTH SESSION: FOUND');
          await fetchRBACData(session.user.id);
        } else {
          console.log('AUTH SESSION: NONE');
          clearRBACState();
        }
      } catch (err) {
        console.error('Unexpected error during auth initialization:', err);
        if (mounted) clearRBACState();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Kick off initialization
    initializeAuth();

    // Listen for future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      // Skip INITIAL_SESSION since getSession handles it explicitly above
      if (event === 'INITIAL_SESSION') return;
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        console.log(`AUTH EVENT: ${event}. Loading RBAC...`);
        // We set loading true if it's a new login to prevent UI flash
        if (event === 'SIGNED_IN') setLoading(true);
        
        await fetchRBACData(currentSession.user.id);
        
        if (mounted && event === 'SIGNED_IN') setLoading(false);
      } else {
        console.log(`AUTH EVENT: ${event}. Clearing RBAC...`);
        clearRBACState();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roleName, permissions, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const usePermission = (permission: string) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};
