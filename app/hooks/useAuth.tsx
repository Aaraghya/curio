import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize token cookies for centralized server access
  const syncCookies = (currSession: Session | null) => {
    if (typeof document !== 'undefined') {
      if (currSession) {
        document.cookie = `sb-access-token=${currSession.access_token}; path=/; max-age=${currSession.expires_in}; SameSite=Lax; Secure`;
        document.cookie = `sb-refresh-token=${currSession.refresh_token}; path=/; max-age=${currSession.expires_in}; SameSite=Lax; Secure`;
      } else {
        document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure`;
        document.cookie = `sb-refresh-token=; path=/; max-age=0; SameSite=Lax; Secure`;
      }
    }
  };

  useEffect(() => {
    // 1. Fetch current session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      syncCookies(initSession);
      setLoading(false);
    });

    // 2. Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      syncCookies(currentSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const token = session?.access_token || '';
  const user = session?.user || null;

  return (
    <AuthContext.Provider value={{ user, session, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
