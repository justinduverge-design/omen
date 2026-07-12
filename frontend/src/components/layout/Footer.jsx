import { useTheme } from '../../lib/themeMode.js';
import { getTeamPalette } from '../../data/nflTeams.js';
import { useActiveMoment } from '../../lib/useActiveMoment.js';

/**
 * Footer with optional cultural-anchor citation (Phase 1.5h).
 *
 * When the user is in Team mode and the active palette (Official or
 * Special) has a `culturalAnchor`, render a quiet italic line beside the
 * copyright. Doesn't render in System / Omen mode, doesn't render when
 * the palette has no anchor (e.g., most Official palettes are null,
 * Specials carry the cultural reference). Justin doctrine 2026-06-21:
 * cultural anchor citation extends to all pages, "in the background or
 * part of the text in the pages."
 */
function CulturalAnchorLine() {
  const { mode, team, variant } = useTheme();
  if (mode !== 'team' || !team) return null;
  const palette = getTeamPalette(team, variant);
  const anchor = palette?.culturalAnchor;
  if (!anchor?.name) return null;
  const yearPart = anchor.year ? ` (${anchor.year})` : '';
  return (
    <span
      className="text-xs italic"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      Painted in the spirit of {anchor.name}{yearPart}.
    </span>
  );
}

/**
 * Moment citation (Phase 1.5g.3). When a cultural moment is active in mock
 * mode, append its citation line alongside the anchor — it never replaces the
 * cultural-anchor citation (Justin doctrine: the anchor always shows; the
 * moment is additive).
 */
function MomentCitationLine() {
  const moment = useActiveMoment();
  const citation = moment?.overlay?.citation;
  if (!citation) return null;
  return (
    <span
      className="text-xs italic"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      {citation}
    </span>
  );
}

export default function Footer() {
  return (
    <footer
      className="border-t"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <span
          className="font-display text-sm uppercase tracking-[0.2em]"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Omen
        </span>
        <CulturalAnchorLine />
        <MomentCitationLine />
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          &copy; {new Date().getFullYear()} Slops Saloon. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
