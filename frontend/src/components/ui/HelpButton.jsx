import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// ── Page-specific help content ─────────────────────────────────────────────

const PAGE_HELP = {
  '/football': {
    title: 'Your Dashboard',
    description: 'Everything in one place — your league standings, weekly Omen, and move history.',
    tips: [
      { label: 'League Standings', body: 'Updates from your connected platform. Tap the header to collapse.' },
      { label: 'Omen of the Week', body: 'Your one move that matters most. Drops Tuesdays after locks.' },
      { label: 'Move History', body: 'Your season record. Tracks every Omen you followed or skipped.' },
      { label: 'Draft Assistant', body: 'Free pick recommendations any time — no account needed.' },
    ],
  },
  '/trade': {
    title: 'Trade Analyzer',
    description: 'Enter the players going each way, compare, and get a plain-English verdict.',
    tips: [
      { label: 'No account required', body: 'Use Trade Analyzer without signing in.' },
      { label: 'Both sides', body: 'Fill in Send and Receive, then hit Compare Trade.' },
      { label: 'Trade Room', body: 'Strategy tips on the right keep context in view while you build.' },
      { label: 'Player names', body: 'Start typing and use autocomplete to lock in the right player.' },
    ],
  },
  '/draft': {
    title: 'Draft Assistant',
    description: 'Tell Omen where you are in the draft and get your best available pick.',
    tips: [
      { label: 'No account required', body: 'Use Draft Assistant without signing in.' },
      { label: 'Preview Mode', body: 'Live personalization activates once the season opens.' },
      { label: 'Position needs', body: 'Select what you still need to fill before each pick.' },
      { label: 'Scoring format', body: 'Switch between PPR, Half PPR, and Standard to match your league.' },
    ],
  },
  '/omen': {
    title: 'Omen of the Week',
    description: 'Your highest-confidence move each week — one call, plain English, no noise.',
    tips: [
      { label: 'Platform required', body: 'Connect Yahoo, Sleeper, or ESPN so Omen can read your roster.' },
      { label: 'Run it', body: 'Hit the button — Omen reads your lineup and surfaces the move.' },
      { label: 'Lock it in', body: 'Submit feedback after the week so Omen can learn from your results.' },
    ],
  },
  '/account/connect': {
    title: 'Connect a Platform',
    description: 'Link your fantasy league so Omen can read your roster and matchups.',
    tips: [
      { label: 'Yahoo', body: 'Click Connect and sign in with your Yahoo account. OAuth — no password stored.' },
      { label: 'Sleeper', body: 'Enter your Sleeper username to connect.' },
      { label: 'ESPN', body: 'Requires your ESPN cookies. See the setup guide for step-by-step instructions.' },
      { label: 'Switch leagues', body: 'You can reconnect or swap platforms at any time from this page.' },
    ],
  },
  '/account/appearance': {
    title: 'Appearance',
    description: 'Pick your NFL team and Omen borrows their colors for accents across the app.',
    tips: [
      { label: 'Live preview', body: 'The Trade Analyzer card on the right updates as you browse.' },
      { label: 'Accent only', body: 'Colors apply to recommendations and CTAs — reads stay neutral.' },
      { label: 'Omen default', body: 'Use the gold default if you want to stay platform-neutral.' },
    ],
  },
  '/account': {
    title: 'Account',
    description: 'Manage your fantasy platform connections and appearance preferences.',
    tips: [
      { label: 'Platforms', body: 'See all connected leagues and reconnect if a token expires.' },
      { label: 'Appearance', body: 'Team colors live under Account → Appearance.' },
      { label: 'Sign out', body: 'Use the nav drawer to sign out when you’re done.' },
    ],
  },
};

function getPageHelp(pathname) {
  // Exact match first, then prefix match
  if (PAGE_HELP[pathname]) return PAGE_HELP[pathname];
  const key = Object.keys(PAGE_HELP).find((k) => k !== '/' && pathname.startsWith(k));
  if (key) return PAGE_HELP[key];
  return {
    title: 'Omen Help',
    description: 'Fantasy football intelligence — less guessing, better moves.',
    tips: [
      { label: 'Trade Analyzer', body: 'Free — analyze any trade before you make it.' },
      { label: 'Omen of the Week', body: 'Your one weekly move, surfaced every Tuesday.' },
      { label: 'Draft Assistant', body: 'Free — pick recommendations for your draft.' },
      { label: 'Connect a league', body: 'Link Yahoo, Sleeper, or ESPN to unlock the full experience.' },
    ],
  };
}

// ── Icons ──────────────────────────────────────────────────────────────────

function QuestionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6.2 6.1c0-.99.8-1.8 1.8-1.8s1.8.81 1.8 1.8c0 .8-.5 1.4-1.2 1.7-.4.16-.6.5-.6.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.5" r=".75" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Help panel ─────────────────────────────────────────────────────────────

function HelpPanel({ open, onClose, pathname }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const help = getPageHelp(pathname);
  const showOnboardingLink = !localStorage.getItem('omen.onboarding.done')
    && !localStorage.getItem('corvus.onboarding.done');

  useEffect(() => {
    if (open) {
      setTimeout(() => closeRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: 'rgba(0,0,0,0.4)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        inert={open ? undefined : ''}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col transition-transform duration-300 ease-in-out"
        style={{
          background: 'var(--color-surface-1)',
          borderLeft: '1px solid var(--color-border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Help
          </p>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close help"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* Page section */}
          <div className="mb-7">
            <h2
              className="mb-2 font-display text-xl font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {help.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {help.description}
            </p>
          </div>

          {/* Tips */}
          <div className="mb-7">
            <p
              className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              How it works
            </p>
            <div className="space-y-4">
              {help.tips.map((tip) => (
                <div key={tip.label}>
                  <p
                    className="mb-0.5 text-xs font-semibold"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {tip.label}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {tip.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div
            className="mb-6 rounded-lg border p-4"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
          >
            <p
              className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Quick links
            </p>
            <div className="space-y-1">
              {[
                { label: 'Football Dashboard', to: '/football' },
                { label: 'Trade Analyzer', to: '/trade' },
                { label: 'Draft Assistant', to: '/draft' },
                { label: 'Connect a Platform', to: '/account/connect' },
                { label: 'Account', to: '/account' },
              ].map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className="flex min-h-[44px] items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-[var(--color-surface-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
                  style={{ color: pathname === to || pathname.startsWith(to + '/') ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                >
                  {label}
                  <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Onboarding re-entry */}
          {showOnboardingLink && (
            <div
              className="rounded-lg border p-4"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-accent) 30%, var(--color-border) 70%)',
                background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
              }}
            >
              <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                Setup not complete
              </p>
              <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                You haven't finished connecting a platform. Complete setup to unlock Omen.
              </p>
              <Link
                to="/onboarding"
                onClick={onClose}
                className="flex min-h-[44px] items-center text-xs font-semibold transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
                style={{ color: 'var(--color-accent)' }}
              >
                Continue setup →
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs"
          style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
        >
          Omen · Less guessing. Better moves.
        </div>
      </div>
    </>
  );
}

// ── Help button ─────────────────────────────────────────────────────────────

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  function openPanel()  { setOpen(true); }
  function closePanel() { setOpen(false); }

  return (
    <>
      <button
        type="button"
        aria-label="Open help"
        aria-expanded={open}
        onClick={openPanel}
        className="fixed right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
          bottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))',
        }}
      >
        <QuestionIcon />
      </button>

      <HelpPanel open={open} onClose={closePanel} pathname={pathname} />
    </>
  );
}
