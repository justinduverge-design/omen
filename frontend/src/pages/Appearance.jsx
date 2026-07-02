import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { apiFetch } from '../lib/api.js';
import { setDataMode } from '../lib/dataMode.js';
import {
  MARQUEE_ABBRS,
  NFL_TEAMS,
  TEAMS_BY_DIV,
  getTeamPalette,
} from '../data/nflTeams.js';
import { getTeamTemplate } from '../lib/teamTemplate.js';
import {
  getThemeMode,
  getThemeTeam,
  setThemeMode,
  setThemeTeam,
  setThemeVariant,
  useTheme,
} from '../lib/themeMode.js';
import {
  CulturalAnchorAttribution,
  ModePicker,
  TeamTile,
  VariantPicker,
} from '../components/theme/AppearancePicker.jsx';

// ── Swatch ────────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  primary:    'Primary',
  secondary:  'Secondary',
  tertiary:   'Tertiary',
  neutral:    'Neutral',
  mute:       'Mute',
  'accent-pop': 'Accent Pop',
};

function Swatch({ color }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-block h-5 w-5 rounded-[3px] flex-shrink-0"
        style={{
          background: color.hex,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
        aria-hidden="true"
      />
      <div className="flex flex-col leading-tight">
        <span
          className="text-[12px] font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {color.name}
        </span>
        <span
          className="font-mono text-[10px] uppercase tabular-nums"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {color.hex.toUpperCase()} · {ROLE_LABEL[color.role] ?? color.role}
        </span>
      </div>
    </div>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────

/**
 * Multi-role preview card. Surface uses team neutral/surface; CTA uses primary
 * with text-on-primary; section header uses secondary; hairline divider uses
 * mute. Renders the full palette in one card so the user sees a real preview
 * of how each role appears in production.
 */
function LivePreview({ template, themed }) {
  return (
    <div
      className="rounded-lg border p-6 transition-colors duration-300"
      style={{
        background: 'var(--color-team-surface-card)',
        borderColor: themed
          ? 'color-mix(in srgb, var(--color-team-primary) 32%, var(--color-border) 68%)'
          : 'var(--color-border)',
      }}
    >
      <div className="mb-5 flex items-baseline justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-[0.32em] transition-colors duration-300"
          style={{
            color: themed && template?.secondary
              ? template.secondary.hex
              : 'var(--color-text-tertiary)',
          }}
        >
          Omen · Omen
        </span>
        <span
          className="rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Preview
        </span>
      </div>

      <h3
        className="mb-2 font-display text-2xl font-semibold"
        style={{ color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        Less guessing. Better moves.
      </h3>

      <p className="mb-4 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
        Confidence and risk both visible whenever a recommendation exists.
      </p>

      {/* Hairline divider in mute */}
      <div
        className="mb-5 h-px"
        style={{
          background: themed && template?.mute
            ? `color-mix(in srgb, ${template.mute.hex} 40%, transparent)`
            : 'var(--color-border-subtle)',
        }}
      />

      <div
        className="w-full rounded-md py-3 text-center font-sans text-base font-semibold transition-colors duration-300"
        style={{
          background: themed && template?.accent
            ? template.accent.hex
            : 'var(--color-accent)',
          color: themed && template?.textOnAccent
            ? template.textOnAccent
            : 'var(--color-text-on-accent)',
        }}
      >
        Accept the call →
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Appearance() {
  const { mode, team: teamAbbr, variant } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Phase 1.5g.3: the appearance picker carries no live fantasy data, so it is
  // mock-safe and is the natural surface to preview cultural-moment chrome
  // (e.g. flip the GB manual flag and see the eyebrow here).
  useEffect(() => {
    setDataMode('mock');
    return () => setDataMode(null);
  }, []);

  const selectedTeam = useMemo(
    () => NFL_TEAMS.find((t) => t.abbr === teamAbbr) ?? null,
    [teamAbbr],
  );

  // Active palette + template (driven by the current variant)
  const palette  = useMemo(() => getTeamPalette(teamAbbr, variant), [teamAbbr, variant]);
  const template = useMemo(() => getTeamTemplate(teamAbbr, variant), [teamAbbr, variant]);

  const marqueeTeams = useMemo(
    () => MARQUEE_ABBRS.map((a) => NFL_TEAMS.find((t) => t.abbr === a)),
    [],
  );
  const extraTeams = useMemo(
    () => TEAMS_BY_DIV.filter((t) => !MARQUEE_ABBRS.includes(t.abbr)),
    [],
  );

  const gridDisabled = mode !== 'team';
  const themed = mode === 'team' && Boolean(selectedTeam);
  const showVariantPicker = themed && Boolean(selectedTeam?.palettes?.some((p) => p.mode === 'special'));
  const hasEyebrowFlourish = Boolean(
    template?.typeFlourishes?.active?.some((f) => f.scope === 'eyebrow'),
  );

  function handleModeChange(next) {
    setThemeMode(next);
  }

  function handleVariantChange(next) {
    setThemeVariant(next);
  }

  async function handleSelectTeam(abbr) {
    setThemeTeam(abbr);
    // Picking a team auto-flips into Team mode so the choice takes effect.
    if (getThemeMode() !== 'team') setThemeMode('team');
    try {
      await apiFetch('/api/account/preferences', {
        method: 'PATCH',
        body: { favorite_team: abbr },
      });
    } catch { /* silent — endpoint not yet built */ }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl pb-24">

        {/* ── Page heading ──────────────────────────────────────── */}
        <div className="mb-10">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Settings · Appearance
          </p>
          <h1
            className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl"
            style={{ color: 'var(--color-text-primary)', lineHeight: 1.02 }}
          >
            Your look.
          </h1>
          <p
            className="font-serif text-lg leading-relaxed"
            style={{ color: 'var(--color-text-primary)', maxWidth: '52ch' }}
          >
            Omen paints with your team's actual colors — every one of them. Pick
            Official for the canonical palette, or a Special variant to swap the
            chrome for a culture-anchored alternate.
          </p>
        </div>

        {/* ── Mode picker ───────────────────────────────────────── */}
        <div className="mb-10">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Mode
          </p>
          <ModePicker mode={mode} onChange={handleModeChange} />
        </div>

        <div className="grid gap-14 xl:grid-cols-[1fr_400px]">

          {/* ── Left: team selector ─────────────────────────────── */}
          <div>

            <div
              className="mb-4 flex items-baseline justify-between"
              style={{ maxWidth: 680 }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {gridDisabled ? 'Team (switches to Team mode)' : 'Choose a team'}
              </span>
              <span
                className="font-mono text-[11px] tabular-nums"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {expanded ? '32 / 32' : `${MARQUEE_ABBRS.length} / 32 shown`}
              </span>
            </div>

            <div
              className="grid grid-cols-4 gap-2 sm:grid-cols-8"
              style={{ maxWidth: 680 }}
              aria-disabled={gridDisabled}
            >
              {marqueeTeams.map((team) => (
                <TeamTile
                  key={team.abbr}
                  team={team}
                  selected={teamAbbr === team.abbr}
                  disabled={gridDisabled}
                  onClick={() => handleSelectTeam(team.abbr)}
                />
              ))}
              {expanded && extraTeams.map((team) => (
                <TeamTile
                  key={team.abbr}
                  team={team}
                  selected={teamAbbr === team.abbr}
                  disabled={gridDisabled}
                  onClick={() => handleSelectTeam(team.abbr)}
                />
              ))}
            </div>

            <div className="mt-4" style={{ maxWidth: 680 }}>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex min-h-[44px] items-center text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)] rounded-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {expanded ? 'Show fewer teams' : 'Show all 32 teams →'}
              </button>
            </div>

            {/* Selected meta */}
            <div
              className="mt-8 pt-6"
              style={{ borderTop: '1px solid var(--color-border)', maxWidth: 680 }}
            >
              <div className="flex flex-col gap-6">

                {/* Header row: team name + division + variant picker */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p
                      className="mb-2 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {themed ? 'Selected' : 'Saved team (not active)'}
                    </p>
                    {selectedTeam ? (
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span
                          className="font-display text-3xl font-bold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {selectedTeam.city} {selectedTeam.name}
                        </span>
                        <span
                          className="font-mono text-[11px] uppercase tracking-widest tabular-nums"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {selectedTeam.div}
                        </span>
                      </div>
                    ) : (
                      <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {mode === 'system' ? 'Following your OS' : 'Omen default'}
                      </span>
                    )}
                  </div>

                  {/* Variant picker — only shown when the team has a special variant
                      AND the user is in Team mode (otherwise sub-mode has no effect). */}
                  {showVariantPicker && (
                    <VariantPicker
                      team={selectedTeam}
                      variant={variant}
                      onChange={handleVariantChange}
                    />
                  )}
                </div>

                {/* Identity copy — only in Team mode, hierarchy across palette
                    roles. Uses `identityPrimary` (the bold "punch") and
                    `identitySecondary` (the quieter eyebrow) — both fall
                    through to contrasting roles when primary == surface so
                    text stays visible on green-on-green teams like GB. */}
                {themed && selectedTeam && (selectedTeam.cry || selectedTeam.wardRoom) && template && (
                  <div className="space-y-1.5">
                    <div className="mb-3">
                      <span
                        className={
                          hasEyebrowFlourish
                            ? 'type-flourish-eyebrow inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-widest'
                            : 'inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest'
                        }
                        style={{
                          color: template.identitySecondary?.hex ?? template.identityPrimary?.hex,
                          borderColor: `color-mix(in srgb, ${(template.identitySecondary?.hex ?? template.identityPrimary?.hex ?? 'var(--color-team-primary)')} 40%, var(--color-border) 60%)`,
                        }}
                      >
                        {selectedTeam.cultureTag}
                      </span>
                    </div>
                    {selectedTeam.cry && (
                      <p
                        className="text-sm font-semibold uppercase tracking-widest"
                        style={{
                          color: template.identitySecondary?.hex ?? template.identityPrimary?.hex,
                          opacity: 0.8,
                        }}
                      >
                        {selectedTeam.cry}
                      </p>
                    )}
                    {selectedTeam.wardRoom && (
                      <p
                        className="text-xl font-bold leading-tight"
                        style={{ color: template.identityPrimary?.hex ?? 'var(--color-team-accent)' }}
                      >
                        {selectedTeam.wardRoom}
                      </p>
                    )}
                    {selectedTeam.lore && (
                      <p
                        className="pt-0.5 text-xs font-medium"
                        style={{
                          color: template.identitySecondary?.hex ?? template.identityPrimary?.hex ?? 'var(--color-team-accent)',
                          opacity: 0.6,
                        }}
                      >
                        {selectedTeam.lore}
                      </p>
                    )}
                  </div>
                )}

                {/* Cultural anchor attribution (variant-aware in 1.5h) */}
                {palette?.culturalAnchor && (
                  <CulturalAnchorAttribution anchor={palette.culturalAnchor} />
                )}

                {/* Full palette swatch row — Phase 1.5h N-swatch view */}
                {palette && (
                  <div>
                    <p
                      className="mb-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Palette · {palette.name}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {palette.colors.map((c) => (
                        <Swatch key={c.role + c.hex} color={c} />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ── Right: live preview ─────────────────────────────── */}
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Live preview
            </p>
            <LivePreview template={template} themed={themed} />
            <p
              className="mt-3 font-serif text-sm italic"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {themed
                ? `Every Omen surface uses ${selectedTeam.name} colors. Switch variants to see the special palette.`
                : mode === 'system'
                ? 'System mode tracks your OS. Switch to Team to paint Omen.'
                : 'Omen mode keeps the brand gold. Switch to Team to paint Omen.'}
            </p>
          </div>
        </div>

        {/* ── Back link ─────────────────────────────────────────── */}
        <div
          className="mt-14 border-t pt-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Link
            to="/account"
            className="rounded-sm text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
          >
            ← Back to account
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
