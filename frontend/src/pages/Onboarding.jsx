import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { apiFetch } from '../lib/api.js';
import { Card } from '../components/ui/Card.jsx';
import {
  OnboardingStatus,
  isOnboardingDone,
  markOnboardingDone,
  resolveOnboardingStatus,
} from '../lib/onboarding.js';

// Onboarding step, kept across remounts.
//
// `step` was plain component state, so anything that remounted this page — a
// route change, a provider redirect coming back, React re-rendering the tree —
// silently dropped the user at screen one. Session storage is the right lifetime:
// it survives the remount and the redirect, and it is gone on the next visit.
const STEP_KEY = 'omen.onboarding.step';

function readStep() {
  try {
    const stored = Number(sessionStorage.getItem(STEP_KEY));
    return Number.isInteger(stored) && stored >= 0 && stored <= 2 ? stored : 0;
  } catch {
    return 0;
  }
}

function writeStep(step) {
  try {
    sessionStorage.setItem(STEP_KEY, String(step));
  } catch {
    // Storage blocked. Losing the step costs a re-click, not correctness.
  }
}

function clearStep() {
  try {
    sessionStorage.removeItem(STEP_KEY);
  } catch {
    // Nothing to clean up if it was never written.
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

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
        className="mb-10 text-lg leading-relaxed"
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

function ConnectStep({ onCheck, checking, status }) {
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
        className="mb-8 text-lg leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', maxWidth: '44ch' }}
      >
        Omen needs your roster and matchup data to generate your weekly move.
        Connect one of the supported platforms to unlock Omen of the Week.
      </p>

      <Card variant="solid" className="mb-8 p-5">
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
            { name: 'ESPN Fantasy',  note: 'Supported — finish setup on a computer' },
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
        <p className="mt-4 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
          Platform trademarks belong to their respective owners. Omen is not endorsed by or
          affiliated with those platforms.
        </p>
      </Card>

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

      {/*
        A failed check and a confirmed "nothing connected" are different facts and
        get different sentences. They used to share one, so a user whose league was
        connected fine but whose check hit a network blip was told their platform
        was missing — and then went and connected it a second time.
      */}
      {status === OnboardingStatus.NOT_CONNECTED && (
        <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--color-risk-high)' }}>
          No platform detected yet. Connect a league using the button above — this page moves on
          by itself once the connection lands.
        </p>
      )}
      {status === OnboardingStatus.UNKNOWN && (
        <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          We couldn't check your setup just now — that's on us, not on you. Nothing is lost.
          Try again in a moment.
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
        className="mb-10 text-lg leading-relaxed"
        style={{ color: 'var(--color-text-primary)', maxWidth: '44ch' }}
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
  const [step, setStepState] = useState(readStep);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);

  const setStep = useCallback((next) => {
    writeStep(next);
    setStepState(next);
  }, []);

  useEffect(() => {
    if (isOnboardingDone()) {
      clearStep();
      navigate('/football', { replace: true });
      return;
    }
    // Returning users may have a valid connection before live recommendations
    // are ready. A server-side connection *is* a completed onboarding, so record
    // it and leave — a fresh browser must not walk an established user back
    // through setup. A failed check leaves them here, which is the safe side of
    // that one: the page itself is usable and offers a retry.
    resolveOnboardingStatus(apiFetch).then((resolved) => {
      if (resolved === OnboardingStatus.CONNECTED) {
        clearStep();
        navigate('/football', { replace: true });
      }
    });
  }, [navigate]);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    setStatus(null);
    const resolved = await resolveOnboardingStatus(apiFetch);
    setStatus(resolved);
    if (resolved === OnboardingStatus.CONNECTED) setStep(2);
    setChecking(false);
  }, [setStep]);

  // The connection is made on another page — or, for ESPN, in another tab. The
  // server knows the moment it lands, so the page asks rather than making the
  // user tell it. "I've connected" stays as a manual nudge, but pressing it is no
  // longer the only way forward: a user who connected and came back to a tab that
  // still said "no platform detected" had every reason to think it had failed.
  useEffect(() => {
    if (step !== 1) return undefined;

    let mounted = true;
    async function recheck() {
      if (document.visibilityState !== 'visible') return;
      const resolved = await resolveOnboardingStatus(apiFetch);
      // Only a positive answer acts. A background poll must never *introduce* an
      // error message the user did not ask for.
      if (mounted && resolved === OnboardingStatus.CONNECTED) setStep(2);
    }

    document.addEventListener('visibilitychange', recheck);
    const timer = setInterval(recheck, 5000);
    recheck();

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', recheck);
      clearInterval(timer);
    };
  }, [step, setStep]);

  function complete() {
    markOnboardingDone();
    clearStep();
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
              O
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
        <div className="w-full max-w-lg">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && (
            <ConnectStep
              onCheck={checkConnection}
              checking={checking}
              status={status}
            />
          )}
          {step === 2 && <CompleteStep onDone={complete} />}
        </div>
      </div>

      {/* Step dots — only during active steps */}
      {step < 2 && <StepDots step={step} />}
    </div>
  );
}
