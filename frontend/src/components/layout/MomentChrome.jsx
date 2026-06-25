import { useEffect } from 'react';
import { applyMomentOverlay, clearMomentTokens } from '../../lib/themeMode.js';
import { useActiveMoment } from '../../lib/useActiveMoment.js';
import MockBanner from '../ui/MockBanner.jsx';

/**
 * MomentChrome — Phase 1.5g.3 cultural-moment overlay (sibling of <main>).
 *
 * Renders a quiet seasonal eyebrow + its mandatory mock badge, and drives the
 * surface-tint CSS vars on :root. Everything is gated by `useActiveMoment` →
 * `resolveActiveMoments`, which fails closed: nothing renders unless the active
 * team declares a moment, the route is in that moment's scope, the moment is in
 * its calendar window (or force-activated via the DEV `?moment=` override), AND
 * the data mode is 'mock'. On /omen and /trade the route resolves to an empty
 * scope set, so the recommendation surfaces never receive moment chrome.
 *
 * The eyebrow and badge appear together or not at all — the spec forbids a
 * badge without its moment, or a moment painted over live data.
 */
export default function MomentChrome() {
  const moment = useActiveMoment();

  useEffect(() => {
    const root = document.documentElement;
    applyMomentOverlay(root, moment ? [moment] : []);
    return () => clearMomentTokens(root);
  }, [moment]);

  if (!moment) return null;

  return (
    <section
      aria-label={`${moment.label} — seasonal chrome`}
      className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 pt-6"
    >
      <p className="moment-eyebrow" style={{ color: 'var(--moment-eyebrow-color)' }}>
        {moment.overlay.eyebrow}
      </p>
      <MockBanner message={moment.mockBadge.copy} />
    </section>
  );
}
