/**
 * =================================================================
 * Supabase client singleton (browser)
 * -----------------------------------------------------------------
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at build time
 * (Vite inlines them into the bundle). Anon key is safe to expose -
 * it's the public client key that goes through Supabase's RLS.
 *
 * If the env vars are missing, exports a stub so the app doesn't
 * crash; auth methods will throw clear errors instead.
 * =================================================================
 */

import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function makeStub() {
  const err = () => Promise.reject(new Error(
    "Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time."
  ));
  return {
    auth: {
      getSession:           err,
      signInWithPassword:   err,
      signUp:               err,
      signOut:              err,
      onAuthStateChange:    () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: err, insert: err, update: err, delete: err }),
    __stub: true,
  };
}

export const supabase = (URL && KEY)
  ? createClient(URL, KEY, {
      auth: {
        persistSession:     true,    // localStorage by default
        autoRefreshToken:   true,    // refresh JWT before expiry
        detectSessionInUrl: true,    // for OAuth callbacks
      },
    })
  : makeStub();

export const isSupabaseConfigured = !supabase.__stub;

// Dev convenience: expose the client to the browser console for poking.
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.supabase = supabase;
}
