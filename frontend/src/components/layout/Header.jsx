import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) setIsAuthenticated(Boolean(data?.session));
      })
      .catch(() => {
        if (mounted) setIsAuthenticated(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          className="text-sm font-semibold tracking-wide text-white"
          to="/"
        >
          Slops Saloon
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-5 text-sm">
          <Link
            className="text-slate-300 transition-colors hover:text-white"
            to="/football"
          >
            Football
          </Link>
          {isAuthenticated ? (
            <Link
              className="text-slate-300 transition-colors hover:text-white"
              to="/account"
            >
              Account
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
