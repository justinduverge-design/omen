import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { storeNextUrl } from '../../lib/nextUrl.js';
import { supabase } from '../../lib/supabase.js';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
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
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <span
          className="h-5 w-5 animate-spin motion-reduce:hidden rounded-full border-2"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
        />
      </div>
    );
  }

  if (!session) {
    storeNextUrl(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  // Onboarding gate — redirect new users until setup is complete.
  // Exempt /onboarding itself to avoid a redirect loop.
  if (
    !localStorage.getItem('omen.onboarding.done') &&
    !localStorage.getItem('corvus.onboarding.done') &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
