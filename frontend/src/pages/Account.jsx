import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import PlatformConnections from '../components/platforms/PlatformConnections.jsx';
import { supabase } from '../lib/supabase.js';

export default function Account() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (!data?.session) {
          navigate('/', { replace: true });
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (mounted) navigate('/', { replace: true });
      });

    return () => { mounted = false; };
  }, [navigate]);

  if (checkingSession) {
    return (
      <AppLayout>
        <p className="text-sm text-slate-400">Checking account access...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Account
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
          Platform Connections
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Connect the fantasy platforms Slops uses to read your rosters.
        </p>
      </section>

      <PlatformConnections />
    </AppLayout>
  );
}
