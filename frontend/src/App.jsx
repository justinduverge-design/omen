import { useEffect } from 'react';
import { getTeamTheme, textSafe } from './data/nflTeams.js';
import { apiFetch } from './lib/api.js';
import { supabase } from './lib/supabase.js';
import { applyTheme } from './lib/theme.js';
import AppRoutes from './routes/index.jsx';

const TEAM_STORAGE_KEY = 'corvus.theme.team';

function applyTeamTheme(abbr) {
  const { accentText, accentBg } = getTeamTheme(abbr || null);
  const root = document.documentElement;
  root.style.setProperty('--color-accent', accentText);
  root.style.setProperty('--color-accent-hover', textSafe(accentBg, 63));
}

export default function App() {
  useEffect(() => {
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, []);

  // Apply stored team theme immediately on mount, then sync from server on sign-in.
  useEffect(() => {
    const stored = localStorage.getItem(TEAM_STORAGE_KEY);
    if (stored) applyTeamTheme(stored);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
      apiFetch('/api/dashboard/summary').then((data) => {
        const serverTeam = data?.user?.favorite_team;
        if (serverTeam) {
          localStorage.setItem(TEAM_STORAGE_KEY, serverTeam);
          applyTeamTheme(serverTeam);
        }
      }).catch(() => {});
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AppRoutes />;
}
