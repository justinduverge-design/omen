/**
 * Minimal Node ESM resolve hook mapping the Vite `@/` → `frontend/src/`
 * alias, so scripts/verify-team-themes.js can import the same lib modules
 * the app uses (teamTheme.js, themeResolver.js) without a bundler.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;
    return nextResolve(target, context);
  }
  return nextResolve(specifier, context);
}
