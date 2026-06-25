import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { MARQUEE_ABBRS, NFL_TEAMS, TEAMS_BY_DIV } from '../data/nflTeams.js';
import { ModePicker, TeamTile } from '../components/theme/AppearancePicker.jsx';
import { getThemeMode, setThemeMode, setThemeTeam, useTheme } from '../lib/themeMode.js';

const DONE_KEY = 'omen.onboarding.done';
const LEGACY_DONE_KEY = 'corvus.onboarding.done';
const CONNECTED_STATUSES = new Set(['ready', 'needs_subscription', 'pending_live_engine']);

// ── Sub-components ─────────────────────────────────────────────────────────

function PickLookStep({ onSkip, onContinue }) {
  const { mode, team: teamAbbr } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const marqueeTeams = useMemo(
    () => MARQUEE_ABBRS.map((a) => NFL_TEAMS.find((t) => t.abbr === a)),
    [],
  );
  const extraTeams = useMemo(
    () => TEAMS_BY_DIV.filter((t) => !MARQUEE_ABBRS.includes(t.abbr)),
    [],
  );

  const gridDisabled = mode !== 'team';

  function handleModeChange(next) {
    setThemeMode(next);
  }

  async function handleSelectTeam(abbr) {
    setThemeTeam(abbr);
    if (getThemeMode() !== 'team') setThemeMode('team');
    try {
      await apiFetch('/api/account/preferences', {
        method: 'PATCH',
        body: { favorite_team: abbr },
      });
    } catch { /* silent — endpoint not yet built */ }
  }

  function handleSkip() {
    setThemeMode('omen');
    onSkip();
  }

  return (
    <div>
      <p
        className="mb-4 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-team-accent)' }}
      >
        Step 1 of 2
      </p>
      <h2
        className="mb-4 font-display font-bold"
        style={{ color: 'var(--color-text-primary)', fontSize: 'clamp(2rem, 7vw, 3.5rem)', lineHeight: 1.04 }}
      >
        Pick your look.
      </h2>
      <p
        className="mb-8 font-serif text-lg leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch' }}
      >
        Omen borrows your team's colors for accents — recommendations, confidence,
        the call to act. Nothing more. Change this anytime in Account → Appearance.
      </p>

      <div className="mb-6">
        <ModePicker mode={mode} onChange={handleModeChange} />
      </div>

      <div className="mb-2 flex items-baseline justify-between">
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

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" aria-disabled={gridDisabled}>
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

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex min-h-[44px] items-center text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)] rounded-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {expanded ? 'Show fewer teams' : 'Show all 32 teams →'}
        </button>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-md px-8 py-4 font-sans text-lg font-semibold transition-all hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
          style={{ background: 'var(--color-team-accent)', color: 'var(--color-text-on-accent)' }}
        >
          Continue →
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-md border px-6 py-3 font-sans text-base font-semibold transition-all hover:bg-[var(--color-surface-2)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Skip — use Omen default
        </button>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }) {
  return (
    <div>
      <p
        className="mb-4 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-accent)' }}
      >
        Welcome to Omen
      </p>
      <h1
        className="mb-6 font-display font-bold"
        style={{ color: 'var(--color-text-primary)', fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', lineHeight: 1.02 }}
      >
        Less guessing.
        <br />
        Better moves.
      </h1>
      <p
        className="mb-10 font-serif text-lg leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', maxWidth: '44ch' }}
      >
        Omen watches your roster, reads the matchups, and surfaces the one
        move that matters most each week. Plain English. No heavy math required.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="rounded-md px-8 py-4 font-sans text-lg font-semibold transition-all hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
      >
        Get started →
      </button>
    </div>
  );
}

function ConnectStep({ onCheck, checking, noConnection }) {
  return (
    <div>
      <p
        className="mb-4 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-accent)' }}
      >
        Step 2 of 2
      </p>
      <h2
        className="mb-4 font-display font-bold"
        style={{ color: 'var(--color-text-primary)', fontSize: 'clamp(2rem, 7vw, 3.5rem)', lineHeight: 1.04 }}
      >
        Connect your league.
      </h2>
      <p
        className="mb-8 font-serif text-lg leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', maxWidth: '44ch' }}
      >
        Omen needs your roster and matchup data to generate your weekly move.
        Connect one of the supported platforms to unlock Omen of the Week.
      </p>

      <div
        className="mb-8 rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <p
          className="mb-4 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Supported platforms
        </p>
        <div className="space-y-3">
          {[
            { name: 'Yahoo Fantasy', note: 'Most popular — full Omen support' },
            { name: 'Sleeper',       note: 'Full Omen support' },
            { name: 'ESPN Fantasy',  note: 'Supported — see setup guide' },
          ].map(({ name, note }) => (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--color-accent)' }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {name}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {note}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          to="/account/connect"
          className="rounded-md px-6 py-3 text-center font-sans text-base font-semibold transition-all hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
        >
          Connect a platform →
        </Link>
        <button
          type="button"
          onClick={onCheck}
          disabled={checking}
          className="rounded-md border px-6 py-3 font-sans text-base font-semibold transition-all hover:bg-[var(--color-surface-2)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          {checking ? 'Checking…' : "I've connected →"}
        </button>
      </div>

      {noConnection && (
        <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--color-risk-high)' }}>
          No platform detected yet. Connect a league using the button above, then return here and
          click "I've connected."
        </p>
      )}

      <p className="mt-6 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        You can also connect or switch platforms later in{' '}
        <Link
          to="/account/connect"
          className="underline underline-offset-2 transition-colors hover:text-[var(--color-text-secondary)]"
        >
          Account → Connect League
        </Link>
        .
      </p>
    </div>
  );
}

function CompleteStep({ onDone }) {
  return (
    <div>
      <div
        className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
          border: '1px solid var(--color-accent)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 10l4.5 4.5L16 6"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2
        className="mb-4 font-display font-bold"
        style={{ color: 'var(--color-text-primary)', fontSize: 'clamp(2rem, 7vw, 3.5rem)', lineHeight: 1.04 }}
      >
        You're set.
      </h2>
      <p
        className="mb-10 font-serif text-lg leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', maxWidth: '44ch' }}
      >
        League connected. Omen reads the matchup the moment your roster locks
        — your first call lands Tuesday.
      </p>
      <button
        type="button"
        onClick={onDone}
        className="rounded-md px-8 py-4 font-sans text-lg font-semibold transition-all hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
      >
        Go to Omen →
      </button>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────

function StepDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 pb-10">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === step ? 24 : 8,
            background: i <= step ? 'var(--color-accent)' : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const [noConnection, setNoConnection] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DONE_KEY) || localStorage.getItem(LEGACY_DONE_KEY)) {
      navigate('/football', { replace: true });
      return;
    }
    // Returning user on new device — check if already connected and skip to complete
    apiFetch('/api/dashboard/summary')
      .then((data) => {
        const status = data?.tools?.omen_of_the_week?.status;
        if (CONNECTED_STATUSES.has(status)) {
          setStep(3);
        }
      })
      .catch(() => {});
  }, [navigate]);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    setNoConnection(false);
    try {
      const data = await apiFetch('/api/dashboard/summary');
      const status = data?.tools?.omen_of_the_week?.status;
      if (CONNECTED_STATUSES.has(status)) {
        setStep(3);
      } else {
        setNoConnection(true);
      }
    } catch {
      setNoConnection(true);
    } finally {
      setChecking(false);
    }
  }, []);

  function complete() {
    localStorage.setItem(DONE_KEY, 'true');
    navigate('/football', { replace: true });
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Minimal header */}
      <div
        className="border-b px-6 py-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2.5">
          <div
            className="grid h-7 w-7 place-items-center rounded-full"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <span
              className="font-display text-sm leading-none"
              style={{ color: 'var(--color-accent)' }}
            >
              C
            </span>
          </div>
          <span
            className="font-display text-[15px] uppercase tracking-[0.34em]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Omen
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className={`w-full ${step === 0 ? 'max-w-2xl' : 'max-w-lg'}`}>
          {step === 0 && (
            <PickLookStep onSkip={() => setStep(1)} onContinue={() => setStep(1)} />
          )}
          {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
          {step === 2 && (
            <ConnectStep
              onCheck={checkConnection}
              checking={checking}
              noConnection={noConnection}
            />
          )}
          {step === 3 && <CompleteStep onDone={complete} />}
        </div>
      </div>

      {/* Step dots — only during active steps */}
      {step < 3 && <StepDots step={step} />}
    </div>
  );
}
