import { useEffect } from 'react';

import { watchTheme, resolveTheme } from '@/lib/themeResolver.js';

/**
 * Runs the team-theme-contract-v1.md resolver (themeResolver.js) on mount
 * and whenever theme-mode prefs change in this tab (team pick, mode switch)
 * or the OS light/dark preference changes. Mount this above <AppRoutes /> so
 * it resolves before any page paints.
 *
 * Room mode ('owner' | 'gm' | 'locker') isn't wired per-page yet (Prompt D) —
 * the resolver defaults to 'locker' until pages set `data-room` on <html>.
 */
export function ThemeProvider({ children }) {
  useEffect(() => {
    const unsubscribe = watchTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onOsChange = () => resolveTheme();
    mq.addEventListener('change', onOsChange);
    return () => {
      unsubscribe();
      mq.removeEventListener('change', onOsChange);
    };
  }, []);

  return children;
}
