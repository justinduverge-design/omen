import { createClient } from '@supabase/supabase-js';

const URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function normalizeSupabaseUrl(url) {
  if (!url) return url;
  return url.replace('.supabase.com', '.supabase.co');
}

function makeStub() {
  const err = () => Promise.reject(
    new Error('Supabase is not configured for this frontend build.')
  );

  return {
    auth: {
      getSession: err,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    __stub: true,
  };
}

export const supabase = URL && KEY
  ? createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : makeStub();

export const isSupabaseConfigured = !supabase.__stub;
