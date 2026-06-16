import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { apiFetch } from '../lib/api.js';
import {
  getTeamTheme,
  isDark,
  MARQUEE_ABBRS,
  NFL_TEAMS,
  readableOn,
  TEAMS_BY_DIV,
  textSafe,
} from '../data/nflTeams.js';

const STORAGE_KEY = 'corvus.theme.team';

// ── Helpers ────────────────────────────────────────────────────────────────

function loadStoredAbbr() {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}

function saveStoredAbbr(abbr) {
  try {
    if (abbr) localStorage.setItem(STORAGE_KEY, abbr);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

function applyCssVars(abbr) {
  const { accentText, accentBg } = getTeamTheme(abbr);
  const root = document.documentElement;
  root.style.setProperty('--color-accent', accentText);
  // Derive hover as slightly brighter (bump L +5)
  root.style.setProperty('--color-accent-hover', textSafe(accentBg, 63));
}

// ── Tile ──────────────────────────────────────────────────────────────────

function TeamTile({ team, selected, onClick, animDelay }) {
  const dark = isDark(team.primary);
  const hasBadge = team.scheme !== 'standard';

  return (
    <button
      type="button"
      aria-label={`${team.city} ${team.name}${team.scheme === 'colorRush' ? ' (color rush)' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'relative grid h-[72px] w-full place-items-center rounded-[5px] transition-all duration-150 motion-reduce:transition-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
        'hover:brightness-110',
        selected ? 'scale-[1.06]' : 'active:scale-[0.97]',
      ].join(' ')}
      style={{
        backgroundColor: team.primary,
        boxShadow: selected
          ? `0 0 0 2px ${team.secondary}`
          : dark
          ? 'inset 0 0 0 1px rgba(255,255,255,0.10)'
          : 'none',
        animationDelay: `${animDelay ?? 0}ms`,
      }}
    >
      {/* Team abbreviation */}
      <span
        className="font-display text-[24px] font-bold leading-none tracking-[0.02em]"
        style={{ color: team.secondary }}
      >
        {team.abbr}
      </span>

      {/* Scheme badge (color rush / secondary swap) */}
      {hasBadge && (
        <span
          className="absolute bottom-[5px] right-[5px] h-[5px] w-[5px] rounded-full opacity-70"
          style={{ background: team.secondary }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ── Trade preview (live accent demo) ─────────────────────────────────────

function TradePreview({ accentBg, accentText, accentOn, themed }) {
  const playerRowStyle = {
    background: 'var(--color-surface-2)',
    borderColor: themed
      ? `color-mix(in srgb, ${accentText} 24%, var(--color-border) 76%)`
      : 'var(--color-border)',
  };

  return (
    <div
      className="rounded-lg border p-6 transition-colors duration-300"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: themed
          ? `color-mix(in srgb, ${accentText} 32%, var(--color-border) 68%)`
          : 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="mb-5 flex items-baseline justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-[0.32em] transition-colors duration-300"
          style={{ color: themed ? accentText : 'var(--color-text-tertiary)' }}
        >
          Corvus · Trade Analyzer
        </span>
        <span
          className="rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Example
        </span>
      </div>

      <h3
        className="mb-6 font-display text-2xl font-semibold"
        style={{ color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        Know the move before you make it.
      </h3>

      {/* Two-column player rows */}
      <div className="mb-6 grid grid-cols-2 gap-5">
        {[
          { label: 'You receive', players: [{ pos: 'RB', name: 'Breece Hall' }, { pos: 'WR', name: 'Chris Olave' }] },
          { label: 'You give', players: [{ pos: 'WR', name: 'Deebo Samuel' }, { pos: 'RB', name: 'James Conner' }] },
        ].map(({ label, players }) => (
          <div key={label}>
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-[0.32em]"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {label}
            </p>
            <div className="space-y-2">
              {players.map(({ pos, name }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 transition-colors duration-300"
                  style={playerRowStyle}
                >
                  <span
                    className="font-mono text-[10px] font-semibold tracking-[0.08em] rounded-sm border px-1.5 py-0.5 transition-colors duration-300"
                    style={{
                      color: themed ? accentText : 'var(--color-text-secondary)',
                      borderColor: themed
                        ? `color-mix(in srgb, ${accentText} 28%, var(--color-border) 72%)`
                        : 'var(--color-border)',
                    }}
                  >
                    {pos}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div
        className="mb-5 rounded-md border px-4 py-3 transition-colors duration-300"
        style={{
          borderColor: `color-mix(in srgb, ${accentText} 40%, var(--color-border) 60%)`,
        }}
      >
        <span
          className="font-mono text-xs font-semibold tracking-[0.16em] transition-colors duration-300"
          style={{ color: themed ? accentText : 'var(--color-text-tertiary)' }}
        >
          ✓ ACCEPT
        </span>
        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
          Your weekly upside improves and you gain a stronger long-term starter.
        </p>
      </div>

      {/* CTA */}
      <div
        className="w-full rounded-md py-3 text-center font-sans text-base font-semibold transition-colors duration-300"
        style={{ background: accentBg, color: accentOn }}
      >
        Analyze Your Trade →
      </div>
    </div>
  );
}

// ── Color swatches ────────────────────────────────────────────────────────

function Swatch({ hex, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-3.5 w-3.5 rounded-[3px]"
        style={{
          background: hex,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function TeamTheme() {
  const [selectedAbbr, setSelectedAbbr] = useState(() => loadStoredAbbr());
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedTeam = useMemo(
    () => NFL_TEAMS.find((t) => t.abbr === selectedAbbr) ?? null,
    [selectedAbbr],
  );

  const { accentBg, accentText, accentOn } = useMemo(
    () => getTeamTheme(selectedAbbr),
    [selectedAbbr],
  );

  const marqueeTeams = useMemo(
    () => MARQUEE_ABBRS.map((a) => NFL_TEAMS.find((t) => t.abbr === a)),
    [],
  );
  const extraTeams = useMemo(
    () => TEAMS_BY_DIV.filter((t) => !MARQUEE_ABBRS.includes(t.abbr)),
    [],
  );

  // Live-update CSS vars as user browses
  useEffect(() => {
    applyCssVars(selectedAbbr);
  }, [selectedAbbr]);

  async function handleSelect(abbr) {
    setSelectedAbbr(abbr);
    saveStoredAbbr(abbr);
    // Best-effort API call — endpoint not yet built; fails silently
    setSaving(true);
    try {
      await apiFetch('/api/account/preferences', {
        method: 'PATCH',
        body: { favorite_team: abbr },
      });
    } catch { /* silent — backend not yet live */ }
    finally { setSaving(false); }
  }

  function handleDefault() {
    setSelectedAbbr(null);
    saveStoredAbbr(null);
    applyCssVars(null);
  }

  const schemeLabel = selectedTeam
    ? { standard: null, secondary: 'secondary swap', colorRush: 'color rush' }[selectedTeam.scheme]
    : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl pb-24">

        {/* ── Page heading ──────────────────────────────────────── */}
        <div className="mb-12">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Settings · Appearance
          </p>
          <h1
            className="mb-4 text-6xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)', lineHeight: 1.02 }}
          >
            Your team.
          </h1>
          <p
            className="font-serif text-lg leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch' }}
          >
            Corvus borrows your team's colors for accents — recommendations, confidence,
            the call to act. Nothing more. The reads stay neutral.
          </p>
        </div>

        <div className="grid gap-14 xl:grid-cols-[1fr_400px]">

          {/* ── Left: selector ──────────────────────────────────── */}
          <div>

            {/* Grid header */}
            <div
              className="mb-4 flex items-baseline justify-between"
              style={{ maxWidth: 680 }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Choose a team
              </span>
              <span
                className="font-mono text-[11px] tabular-nums"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {expanded ? '32 / 32' : `${MARQUEE_ABBRS.length} / 32 shown`}
              </span>
            </div>

            {/* Tile grid */}
            <div
              className="grid grid-cols-4 gap-2 sm:grid-cols-8"
              style={{ maxWidth: 680 }}
            >
              {marqueeTeams.map((team, i) => (
                <TeamTile
                  key={team.abbr}
                  team={team}
                  selected={selectedAbbr === team.abbr}
                  onClick={() => handleSelect(team.abbr)}
                  animDelay={i * 18}
                />
              ))}
              {expanded && extraTeams.map((team, i) => (
                <TeamTile
                  key={team.abbr}
                  team={team}
                  selected={selectedAbbr === team.abbr}
                  onClick={() => handleSelect(team.abbr)}
                  animDelay={i * 12}
                />
              ))}
            </div>

            {/* Expand / collapse */}
            <div className="mt-4" style={{ maxWidth: 680 }}>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex min-h-[44px] items-center text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderBottom: '1px solid transparent',
                  paddingBottom: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                  e.currentTarget.style.borderBottomColor = 'var(--color-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }}
              >
                {expanded ? 'Show fewer teams' : 'Show all 32 teams →'}
              </button>
            </div>

            {/* Selected meta */}
            <div
              className="mt-8 pt-6"
              style={{
                borderTop: '1px solid var(--color-border)',
                maxWidth: 680,
              }}
            >
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Selected
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
                              color: accentText,
                              borderColor: `color-mix(in srgb, ${accentText} 40%, var(--color-border) 60%)`,
                            }}
                          >
                            {schemeLabel}
                          </span>
                        )}
                      </div>

                      {/* Identity block */}
                      {(selectedTeam.cry || selectedTeam.wardRoom) && (
                        <div className="mt-5 space-y-1.5">

                          {/* cultureTag — pill */}
                          <div className="mb-3">
                            <span
                              className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
                              style={{
                                color: accentText,
                                borderColor: `color-mix(in srgb, ${accentText} 40%, var(--color-border) 60%)`,
                              }}
                            >
                              {selectedTeam.cultureTag}
                            </span>
                          </div>

                          {/* cry — the chant, lighter weight */}
                          {selectedTeam.cry && (
                            <p
                              className="text-sm font-semibold uppercase tracking-widest"
                              style={{ color: accentText, opacity: 0.65 }}
                            >
                              {selectedTeam.cry}
                            </p>
                          )}

                          {/* wardRoom — the statement, full weight */}
                          {selectedTeam.wardRoom && (
                            <p
                              className="text-xl font-bold leading-tight"
                              style={{ color: accentText }}
                            >
                              {selectedTeam.wardRoom}
                            </p>
                          )}

                          {/* lore — the deep cut, most muted */}
                          {selectedTeam.lore && (
                            <p
                              className="pt-0.5 text-xs font-medium"
                              style={{ color: accentText, opacity: 0.45 }}
                            >
                              {selectedTeam.lore}
                            </p>
                          )}

                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      Corvus default
                    </span>
                  )}
                </div>

                {/* Color swatches */}
                <div className="flex flex-col gap-1.5 pb-1">
                  {selectedTeam ? (
                    <>
                      <Swatch hex={selectedTeam.primary} label="primary" />
                      <Swatch hex={accentBg} label={selectedTeam.scheme !== 'standard' ? 'accent' : null} />
                    </>
                  ) : (
                    <Swatch hex="#B8952A" label="default" />
                  )}
                </div>
              </div>

              {/* Scheme note */}
              {selectedTeam?.note && (
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)', maxWidth: '56ch' }}
                >
                  {selectedTeam.note}
                </p>
              )}

              {/* Corvus default option */}
              <div className="mt-5">
                <button
                  type="button"
                  aria-pressed={selectedAbbr === null}
                  onClick={handleDefault}
                  className="inline-flex min-h-[44px] items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
                >
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-[3px]"
                    style={{
                      background: '#B8952A',
                      boxShadow: selectedAbbr === null
                        ? 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 2px #0A0A0B, 0 0 0 3px #B8952A'
                        : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: selectedAbbr === null ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                  >
                    Corvus default
                  </span>
                </button>
              </div>

              {/* Dot legend */}
              <p
                className="mt-6 text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                Dot on tile = color rush or secondary swap applied.
              </p>
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
            <TradePreview
              accentBg={accentBg}
              accentText={accentText}
              accentOn={accentOn}
              themed={selectedAbbr !== null}
            />
            <p
              className="mt-3 font-serif italic text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Pick a team above — the accent updates everywhere Corvus draws attention.
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
            className="rounded-sm text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            ← Back to account
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
