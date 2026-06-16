import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';

const supabaseUrl = isServer
  ? (process.env.SUPABASE_URL || '')
  : ((window as any).env?.SUPABASE_URL || '');

const supabaseAnonKey = isServer
  ? (process.env.SUPABASE_ANON_KEY || '')
  : ((window as any).env?.SUPABASE_ANON_KEY || '');

const supabaseServiceKey = isServer
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  : '';

if (!supabaseUrl) {
  console.warn('SUPABASE_URL is missing. Database operations will fail.');
}

// 1. Public Client (For browser-side OAuth redirects and auth listener)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Admin Client (Strictly for Server Functions to write database entries and bypass RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  isServer ? supabaseServiceKey : 'browser-bypass-placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

