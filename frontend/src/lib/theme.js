const STORAGE_KEY = 'slops-theme';
const VALID = ['dark', 'light', 'system'];

function resolvedTheme(stored) {
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme() {
  const stored = localStorage.getItem(STORAGE_KEY) || 'system';
  document.documentElement.setAttribute('data-theme', resolvedTheme(stored));
}

export function getThemeSetting() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return VALID.includes(stored) ? stored : 'system';
}

export function setTheme(value) {
  if (!VALID.includes(value)) return;
  localStorage.setItem(STORAGE_KEY, value);
  applyTheme();
}
