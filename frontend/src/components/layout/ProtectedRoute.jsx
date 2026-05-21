import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';
import { supabase } from '../../lib/supabase.js';

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data?.session ?? null);
    }).catch(() => {
      if (mounted) setSession(null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  // Secondary server-side session verification — fires after client auth resolves.
  // If the server disagrees with the client, sign out to clear stale token state.
  useEffect(() => {
    if (!session) return;

    apiFetch('/api/session').then((data) => {
      if (data?.authenticated === false) {
        supabase.auth.signOut();
      }
    }).catch(() => {
      // Network error or server unavailable — fail silently, do not block the UI.
    });
  }, [session]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;

  return children;
}
