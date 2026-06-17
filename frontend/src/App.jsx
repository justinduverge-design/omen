import { useEffect } from 'react';
import { apiFetch } from './lib/api.js';
import { supabase } from './lib/supabase.js';
import { applyThemeMode, getThemeMode, getThemeTeam, setThemeTeam } from './lib/themeMode.js';
import AppRoutes from './routes/index.jsx';

export default function App() {
  // Apply theme mode (data-theme + team tokens) on mount and whenever the OS
  // light/dark preference changes (System mode tracks it).
  useEffect(() => {
    applyThemeMode();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // On sign-in, sync the saved favorite_team from the server. We do NOT change
  // the mode — that's the user's setting and survives across sessions.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
      apiFetch('/api/dashboard/summary').then((data) => {
        const serverTeam = data?.user?.favorite_team;
        if (serverTeam && serverTeam !== getThemeTeam()) {
          setThemeTeam(serverTeam);
        }
        // applyThemeMode() runs inside setThemeTeam; if no change, refresh once
        // to honor the saved mode picked up from localStorage.
        if (getThemeMode()) applyThemeMode();
      }).catch(() => {});
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AppRoutes />;
}
