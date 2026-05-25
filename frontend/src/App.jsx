import { useEffect } from 'react';
import { applyTheme } from './lib/theme.js';
import AppRoutes from './routes/index.jsx';

export default function App() {
  useEffect(() => {
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, []);

  return <AppRoutes />;
}
