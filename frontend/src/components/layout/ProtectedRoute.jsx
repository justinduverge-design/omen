import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { storeNextUrl } from '../../lib/nextUrl.js';
import { OnboardingStatus, isOnboardingDone, resolveOnboardingStatus } from '../../lib/onboarding.js';
import { supabase } from '../../lib/supabase.js';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [session, setSession] = useState(undefined); // undefined = still loading
  // undefined = not yet resolved against the server; otherwise an OnboardingStatus.
  const [onboarding, setOnboarding] = useState(
    () => (isOnboardingDone() ? OnboardingStatus.CONNECTED : undefined),
  );

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

  // The local flag is a cache, not the record. When it is absent, ask the server
  // once before assuming this is a new user — otherwise a cleared cache, a new
  // browser, an incognito window, or a second device re-onboards an established
  // account. Exempt /onboarding itself so the page can run its own check.
  useEffect(() => {
    if (!session || onboarding !== undefined) return;
    let mounted = true;
    resolveOnboardingStatus(apiFetch).then((status) => {
      if (mounted) setOnboarding(status);
    });
    return () => { mounted = false; };
  }, [session, onboarding]);

  if (session === undefined || (session && onboarding === undefined && location.pathname !== '/onboarding')) {
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
  //
  // Only a *confirmed* NOT_CONNECTED redirects. This used to be `if (!onboarded)`
  // over a boolean that was false both for "no league connected" and for "the
  // check failed", so one flaky `/api/platforms` response threw an established
  // user back to the first setup screen. An UNKNOWN answer is not evidence about
  // the user, so the destination renders instead — and every destination already
  // has an honest disconnected state with its own connect action, which is a far
  // better wrong answer than re-onboarding someone who is already set up.
  // Exempt /onboarding itself to avoid a redirect loop.
  if (onboarding === OnboardingStatus.NOT_CONNECTED && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
