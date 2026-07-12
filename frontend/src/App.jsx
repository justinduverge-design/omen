import { useEffect } from 'react';
import { applyThemeMode } from './lib/themeMode.js';
import AppRoutes from './routes/index.jsx';

export default function App() {
  // Apply theme mode (data-theme) on mount and whenever the OS light/dark
  // preference changes (System mode tracks it).
  useEffect(() => {
    applyThemeMode();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return <AppRoutes />;
}
