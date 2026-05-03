/**
 * =================================================================
 * useAuth - tiny React hook for Supabase auth state
 * -----------------------------------------------------------------
 * Returns { session, user, loading, signIn, signUp, signOut }.
 * Auto-listens to Supabase auth state changes (session refresh,
 * sign-out from another tab, etc.).
 *
 * Usage:
 *   const { user, loading, signIn, signOut } = useAuth();
 *   if (loading) return <Spinner />;
 *   if (!user)   return <LoginModal onSubmit={signIn} />;
 *   return <Dashboard />;
 * =================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Restore session from storage on mount.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session || null);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setLoading(false);
    });

    // Subscribe to auth changes (sign-in, sign-out, token refresh,
    // sign-out from another tab via storage events).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    session,
    user: session?.user || null,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
