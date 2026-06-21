import { getTeamPalette, isDark } from '../../data/nflTeams.js';

// ── Mode picker ────────────────────────────────────────────────────────────

export const MODE_OPTIONS = [
  { id: 'system', label: 'System', hint: 'Matches your OS theme. Corvus gold accents.' },
  { id: 'team',   label: 'Team',   hint: "Your team's actual colors paint the app." },
  { id: 'corvus', label: 'Corvus', hint: 'Default dark. Gold on graphite.' },
];

export function ModePicker({ mode, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Appearance mode"
      className="grid gap-2 sm:grid-cols-3"
    >
      {MODE_OPTIONS.map((opt) => {
        const selected = mode === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={selected}
            type="button"
            onClick={() => onChange(opt.id)}
            className="min-h-[44px] rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
            style={{
              borderColor: selected ? 'var(--color-team-accent)' : 'var(--color-border)',
              background: selected ? 'color-mix(in srgb, var(--color-team-accent) 10%, var(--color-surface-1))' : 'var(--color-surface-1)',
              color: 'var(--color-text-primary)',
            }}
          >
            <span
              className="block text-sm font-semibold"
              style={{ color: selected ? 'var(--color-team-accent)' : 'var(--color-text-primary)' }}
            >
              {opt.label}
            </span>
            <span className="mt-0.5 block text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Variant (sub-mode) picker — Phase 1.5h ───────────────────────────────

/**
 * Render an "Official / [Special name]" toggle when the selected team has
 * a special variant. Renders nothing for teams with official-only palettes
 * (CLE, LAR as of 1.5h).
 */
export function VariantPicker({ team, variant, onChange }) {
  if (!team) return null;
  const specialPalette = team.palettes?.find((p) => p.mode === 'special');
  if (!specialPalette) return null;

  const options = [
    { id: 'official', label: 'Official' },
    { id: 'special',  label: specialPalette.name },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Palette variant"
      className="inline-flex rounded-full border p-0.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-team-primary) 40%, var(--color-border) 60%)',
        background: 'var(--color-team-surface-card)',
      }}
    >
      {options.map((opt) => {
        const selected = variant === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={selected}
            type="button"
            onClick={() => onChange(opt.id)}
            className="min-h-[36px] rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-primary)]"
            style={{
              background: selected ? 'var(--color-team-primary)' : 'transparent',
              color:      selected ? 'var(--color-team-text-on-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Cultural anchor attribution (Phase 1.5f, extended in 1.5h) ────────────

const KIND_PREFIX = {
  film:      'Inspired by',
  music:     'Inspired by',
  art:       'Inspired by',
  region:    'Anchored in',
  history:   'Anchored in',
  tradition: 'Anchored in',
};

/**
 * One-line attribution surfaced under the selected team on /account/appearance
 * (and any other page that opts into displaying it). Takes the anchor object
 * directly so callers can pass either the palette's anchor or null.
 */
export function CulturalAnchorAttribution({ anchor }) {
  if (!anchor?.name) return null;
  const { name, year, kind } = anchor;
  const prefix = KIND_PREFIX[kind] ?? 'Anchored in';
  const yearPart = year ? ` (${year})` : '';
  return (
    <p
      className="mt-3 font-serif text-xs italic leading-relaxed"
      style={{ color: 'var(--color-text-tertiary)', maxWidth: '52ch' }}
    >
      {prefix} {name}{yearPart}.
    </p>
  );
}

// ── Tile ──────────────────────────────────────────────────────────────────

/**
 * Team tile in the grid. Uses the team's official-palette primary as fill,
 * secondary as the glyph color (with neutral fallback). A small dot on
 * teams with a special variant signals there's an alternate palette.
 */
export function TeamTile({ team, selected, disabled, onClick }) {
  const palette = getTeamPalette(team.abbr, 'official');
  const primary    = palette?.byRole?.primary?.hex   ?? '#1C1C1E';
  const secondary  = palette?.byRole?.secondary?.hex ?? palette?.byRole?.neutral?.hex ?? '#F5F0E8';
  const neutral    = palette?.byRole?.neutral?.hex   ?? '#F5F0E8';
  const hasSpecial = Boolean(team.palettes?.some((p) => p.mode === 'special'));
  const dark = isDark(primary);

  return (
    <button
      type="button"
      aria-label={`${team.city} ${team.name}${hasSpecial ? ' (has special variant)' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'relative grid h-[72px] w-full place-items-center rounded-[5px] transition-all duration-150 motion-reduce:transition-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]',
        disabled ? 'hover:brightness-100' : 'hover:brightness-110',
        selected ? 'scale-[1.06]' : 'active:scale-[0.97]',
      ].join(' ')}
      style={{
        backgroundColor: primary,
        opacity: disabled ? 0.45 : 1,
        boxShadow: selected
          ? `0 0 0 2px ${secondary}`
          : dark
          ? 'inset 0 0 0 1px rgba(255,255,255,0.10)'
          : 'none',
      }}
    >
      <span
        className="font-display text-[24px] font-bold leading-none tracking-[0.02em]"
        style={{ color: dark ? secondary : neutral }}
      >
        {team.abbr}
      </span>
      {hasSpecial && (
        <span
          className="absolute bottom-[5px] right-[5px] h-[5px] w-[5px] rounded-full opacity-70"
          style={{ background: secondary }}
          aria-hidden="true"
          title="Special variant available"
        />
      )}
    </button>
  );
}
