import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { apiFetch } from '../lib/api.js';
import {
  MARQUEE_ABBRS,
  NFL_TEAMS,
  readableOn,
  TEAMS_BY_DIV,
} from '../data/nflTeams.js';
import { getTeamTemplate } from '../lib/teamTemplate.js';
import {
  getThemeMode,
  getThemeTeam,
  setThemeMode,
  setThemeTeam,
  useTheme,
} from '../lib/themeMode.js';
import { ModePicker, TeamTile } from '../components/theme/AppearancePicker.jsx';

// ── Swatch ────────────────────────────────────────────────────────────────

function Swatch({ hex, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-3.5 w-3.5 rounded-[3px]"
        style={{ background: hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
      />
      <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--color-text-tertiary)' }}>
        {hex.toUpperCase()}
      </span>
      {label && (
        <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
          ({label})
        </span>
      )}
    </div>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────

function LivePreview({ team, themed }) {
  return (
    <div
      className="rounded-lg border p-6 transition-colors duration-300"
      style={{
        background: 'var(--color-team-surface-card)',
        borderColor: themed
          ? 'color-mix(in srgb, var(--color-team-accent) 32%, var(--color-border) 68%)'
          : 'var(--color-border)',
      }}
    >
      <div className="mb-5 flex items-baseline justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-[0.32em] transition-colors duration-300"
          style={{ color: themed ? 'var(--color-team-accent)' : 'var(--color-text-tertiary)' }}
        >
          Corvus · Omen
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

      <p className="mb-6 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
        Confidence and risk both visible whenever a recommendation exists.
      </p>

      <div
        className="w-full rounded-md py-3 text-center font-sans text-base font-semibold transition-colors duration-300"
        style={{
          background: themed && team ? 'var(--color-team-accent)' : 'var(--color-accent)',
          color: themed && team ? readableOn(team.accent) : '#0A0A0B',
        }}
      >
        Accept the call →
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Appearance() {
  const { mode, team: teamAbbr } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const selectedTeam = useMemo(
    () => NFL_TEAMS.find((t) => t.abbr === teamAbbr) ?? null,
    [teamAbbr],
  );

  const recipe = useMemo(() => getTeamTemplate(teamAbbr), [teamAbbr]);

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

  function handleModeChange(next) {
    setThemeMode(next);
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

  const schemeLabel = selectedTeam
    ? { standard: null, secondary: 'secondary swap', colorRush: 'color rush' }[selectedTeam.scheme]
    : null;

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
            style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch' }}
          >
            Corvus borrows your team's colors for accents — recommendations, confidence,
            the call to act. Nothing more. The reads stay neutral.
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
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {themed ? 'Selected' : 'Saved team (not active)'}
                  </p>
                  {selectedTeam ? (
                    <div>
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
                        {schemeLabel && (
                          <span
                            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                            style={{
                              color: 'var(--color-team-accent)',
                              borderColor: 'color-mix(in srgb, var(--color-team-accent) 40%, var(--color-border) 60%)',
                            }}
                          >
                            {schemeLabel}
                          </span>
                        )}
                      </div>

                      {/* Identity block — only in Team mode */}
                      {themed && (selectedTeam.cry || selectedTeam.wardRoom) && (
                        <div className="mt-5 space-y-1.5">
                          <div className="mb-3">
                            <span
                              className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
                              style={{
                                color: 'var(--color-team-accent)',
                                borderColor: 'color-mix(in srgb, var(--color-team-accent) 40%, var(--color-border) 60%)',
                              }}
                            >
                              {selectedTeam.cultureTag}
                            </span>
                          </div>
                          {selectedTeam.cry && (
                            <p
                              className="text-sm font-semibold uppercase tracking-widest"
                              style={{ color: 'var(--color-team-accent)', opacity: 0.65 }}
                            >
                              {selectedTeam.cry}
                            </p>
                          )}
                          {selectedTeam.wardRoom && (
                            <p
                              className="text-xl font-bold leading-tight"
                              style={{ color: 'var(--color-team-accent)' }}
                            >
                              {selectedTeam.wardRoom}
                            </p>
                          )}
                          {selectedTeam.lore && (
                            <p
                              className="pt-0.5 text-xs font-medium"
                              style={{ color: 'var(--color-team-accent)', opacity: 0.45 }}
                            >
                              {selectedTeam.lore}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {mode === 'system' ? 'Following your OS' : 'Corvus default'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 pb-1">
                  {selectedTeam ? (
                    <>
                      <Swatch hex={selectedTeam.primary} />
                      <Swatch hex={selectedTeam.accent} />
                      {recipe && <Swatch hex={recipe.surface} />}
                    </>
                  ) : (
                    <Swatch hex="#B8952A" label="brand gold" />
                  )}
                </div>
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
            <LivePreview team={selectedTeam} themed={themed} />
            <p
              className="mt-3 font-serif text-sm italic"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {themed
                ? "The accent updates everywhere Corvus draws attention."
                : mode === 'system'
                ? "System mode tracks your OS. Switch to Team to paint Corvus."
                : "Corvus mode keeps the brand gold. Switch to Team to paint Corvus."}
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
