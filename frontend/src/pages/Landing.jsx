import { useState } from 'react';
import { apiFetch } from '../lib/api.js';

// ─── Shared primitives ────────────────────────────────────────────────────────

function Button({ children, className = '', disabled = false, href }) {
  const base =
    'inline-flex min-h-[44px] items-center justify-center rounded-md px-6 text-sm font-semibold transition-colors active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]';
  const cls = [base, disabled ? 'cursor-default opacity-55' : '', className]
    .filter(Boolean)
    .join(' ');
  if (href) return <a className={cls} href={href}>{children}</a>;
  return <button className={cls} disabled={disabled} type="button">{children}</button>;
}

function Arrow() {
  return <span aria-hidden="true" className="ml-1.5 text-base leading-none">→</span>;
}

// ─── Header ───────────────────────────────────────────────────────────────────

function OmenLogo() {
  return (
    <>
      <img src="/omen-horizontal-lockup-transparent.png" alt="Omen" className="omen-lockup-on-dark h-12 w-auto" />
      <img src="/omen-horizontal-lockup-raven.png" alt="Omen" className="omen-lockup-on-light h-12 w-auto" />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[var(--color-bg)]/88 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <OmenLogo />
        <div className="flex items-center gap-6">
          <a
            className="inline-flex min-h-[44px] items-center rounded-sm text-xs uppercase tracking-[0.28em] text-[var(--color-text-primary)]/45 transition-colors hover:text-[var(--color-text-primary)]/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            href="#waitlist"
          >
            Join Waitlist
          </a>
          <a
            className="inline-flex min-h-[44px] items-center rounded-sm text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]/80 transition-colors hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            href="/login"
          >
            Sign In →
          </a>
        </div>
      </div>
    </header>
  );
}

// ─── Story arc steps ──────────────────────────────────────────────────────────

const storySteps = [
  'Every trade carries risk.',
  'Omen reads the full picture.',
  'You get a clear signal.',
];

function StoryArc() {
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-6">
      {storySteps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-[var(--color-accent)]/50">
            {'0' + (i + 1)}
          </span>
          <span className="text-xs leading-5 text-[var(--color-text-primary)]/45">{step}</span>
          {i < storySteps.length - 1 && (
            <span
              aria-hidden="true"
              className="hidden shrink-0 text-[var(--color-text-primary)]/20 sm:block"
            >
              /
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Trade Analyzer hero card ─────────────────────────────────────────────────

function PlayerChip({ name, position }) {
  const posStyle = {
    RB: 'text-[var(--color-pos-rb)] border-[var(--color-pos-rb)]/30 bg-[var(--color-pos-rb)]/8',
    WR: 'text-[var(--color-pos-wr)] border-[var(--color-pos-wr)]/30 bg-[var(--color-pos-wr)]/8',
  };
  const style = posStyle[position] ?? 'text-[var(--color-text-primary)]/55 border-white/15 bg-white/5';
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <span
        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style}`}
      >
        {position}
      </span>
      <span className="text-sm font-medium text-[var(--color-text-primary)]">{name}</span>
    </div>
  );
}

function TradeAnalyzerHeroCard() {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-surface-1)]/95 shadow-2xl shadow-black/70">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[var(--color-accent)]/9 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[var(--color-omen)]/35 blur-3xl" />

      <div className="relative p-5 md:p-7">
        {/* Card header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">
            Trade Analyzer
          </p>
          <span className="rounded-full border border-[var(--color-accent)]/25 px-3 py-1 text-[10px] text-[var(--color-accent)]/70">
            Example
          </span>
        </div>

        {/* Players */}
        <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-primary)]/38">
              You receive
            </p>
            <div className="flex flex-col gap-2">
              <PlayerChip name="Breece Hall" position="RB" />
              <PlayerChip name="Chris Olave" position="WR" />
            </div>
          </div>

          <div aria-hidden="true" className="mt-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-sm text-[var(--color-text-primary)]/35">
            ⇄
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-primary)]/38">
              You give
            </p>
            <div className="flex flex-col gap-2">
              <PlayerChip name="Deebo Samuel" position="WR" />
              <PlayerChip name="James Conner" position="RB" />
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--color-risk-low)]/22 bg-[var(--color-risk-low)]/7 px-4 py-3">
          <div aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-risk-low)]/18">
            <span className="text-xs font-bold text-[var(--color-risk-low)]">✓</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-risk-low)]">
              Accept
            </span>
            <p className="mt-0.5 text-sm leading-5 text-[var(--color-text-primary)]/75">
              Your weekly upside improves, and you gain a stronger long-term starter.
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-primary)]/38">
              Omen Edge
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-accent)]">Strong</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-primary)]/38">
              Risk
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">Medium</p>
          </div>
          <div className="col-span-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-primary)]/38">
              Why it matters
            </p>
            <p className="mt-1 text-xs leading-4 text-[var(--color-text-primary)]/60">
              Weekly upside + long-term depth
            </p>
          </div>
        </div>

        {/* CTA inside card */}
        <div className="rounded-xl border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/5 p-4">
          <p className="mb-3 text-xs leading-5 text-[var(--color-text-primary)]/52">
            This is a sample result. Sign in to run the live Trade Analyzer on your own players.
          </p>
          <Button
            className="w-full bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]"
            href="/about"
          >
            Analyze Your Trade <Arrow />
          </Button>
        </div>
      </div>
    </article>
  );
}

// ─── Secondary cards ──────────────────────────────────────────────────────────

function OmenMiniCard() {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--color-accent)]/18 bg-[var(--color-surface-1)]/90 shadow-xl shadow-black/50">
      <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-[var(--color-accent)]/7 blur-3xl" />
      <div className="relative p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">
            Omen of the Week
          </p>
          <span className="rounded-full border border-[var(--color-accent)]/22 px-2.5 py-0.5 text-[10px] text-[var(--color-accent)]/65">
            Preview
          </span>
        </div>
        <h3 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
          Strike the waiver wire
        </h3>
        <div className="mb-4 rounded-xl border border-white/8 bg-[var(--color-bg)]/70 p-3.5">
          <p className="text-xs text-[var(--color-text-primary)]/45">Best available move</p>
          <p className="mt-1.5 text-sm font-semibold leading-5 text-[var(--color-text-primary)]">
            Add RB Jaylen Warren. Start him at FLEX.
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-primary)]/50">
            Cleaner matchup path, higher floor than your current FLEX option.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[10px] text-[var(--color-text-primary)]/38">Projected swing</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">+6.8 pts</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[10px] text-[var(--color-text-primary)]/38">Confidence</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">82%</p>
          </div>
        </div>
        <a
          className="mt-4 flex min-h-[44px] items-center justify-center text-center text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]/65 transition-colors hover:text-[var(--color-accent)]"
          href="/login?next=/omen"
        >
          See your Omen →
        </a>
      </div>
    </article>
  );
}

function DraftAssistantMiniCard() {
  const tiers = [
    { rank: 1, name: "Ja'Marr Chase", pos: 'WR', tag: 'Elite' },
    { rank: 2, name: 'CeeDee Lamb', pos: 'WR', tag: 'Elite' },
    { rank: 3, name: 'Christian McCaffrey', pos: 'RB', tag: 'Top 3' },
  ];
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/12 bg-[var(--color-surface-1)]/90 shadow-xl shadow-black/50">
      <div className="pointer-events-none absolute left-0 top-0 h-36 w-36 rounded-full bg-[var(--color-risk-high)]/12 blur-3xl" />
      <div className="relative p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-text-primary)]/55">
            Draft Assistant
          </p>
          <span className="rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] text-[var(--color-text-primary)]/38">
            Preview
          </span>
        </div>
        <h3 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
          Know your pick before it's your turn.
        </h3>
        <div className="mb-4 flex flex-col gap-1.5">
          {tiers.map((p) => (
            <div
              key={p.rank}
              className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2"
            >
              <span className="w-4 shrink-0 text-xs text-[var(--color-text-primary)]/28">{p.rank}</span>
              <span className="flex-1 text-sm text-[var(--color-text-primary)]">{p.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-primary)]/38">
                {p.pos}
              </span>
              <span className="rounded border border-[var(--color-accent)]/22 px-1.5 py-0.5 text-[10px] text-[var(--color-accent)]/65">
                {p.tag}
              </span>
            </div>
          ))}
        </div>
        <a
          className="flex min-h-[44px] items-center justify-center text-center text-xs uppercase tracking-[0.24em] text-[var(--color-text-primary)]/45 transition-colors hover:text-[var(--color-text-primary)]/75"
          href="/draft"
        >
          Open Draft Assistant →
        </a>
      </div>
    </article>
  );
}

// ─── Sign-in shortcut (existing users) ───────────────────────────────────────

function SignInForm() {
  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-primary)]/32">
        Already have an account?
      </p>
      <a
        className="mt-2 inline-flex min-h-[44px] items-center rounded-md border border-[var(--color-accent)]/28 px-5 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)]/55 hover:bg-[var(--color-accent)]/10"
        href="/login"
      >
        Sign in →
      </a>
    </div>
  );
}

// ─── Inline waitlist form (hero) ──────────────────────────────────────────────

function HeroWaitlist() {
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    try {
      await apiFetch('/api/waitlist', {
        method: 'POST',
        body: { email, platform: platform || null },
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="mt-6 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 px-5 py-4">
        <p className="text-sm font-semibold text-[var(--color-accent)]">You're on the list.</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-primary)]/55">The raven will send word.</p>
      </div>
    );
  }

  return (
    <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
      {/* Platform pills */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <label
            key={p}
            className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              platform === p
                ? 'border-[var(--color-accent)]/55 bg-[var(--color-accent)]/14 text-[var(--color-accent)]'
                : 'border-white/14 bg-transparent text-[var(--color-text-primary)]/40 hover:border-white/28 hover:text-[var(--color-text-primary)]/65'
            }`}
          >
            <input
              checked={platform === p}
              className="sr-only"
              name="hero-platform"
              type="radio"
              value={p}
              onChange={() => setPlatform(p)}
            />
            {p}
          </label>
        ))}
      </div>

      {/* Email + submit */}
      <div className="flex gap-2">
        <input
          aria-label="Email address"
          className="min-h-[44px] flex-1 rounded-md border border-white/12 bg-[var(--color-bg)] px-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-primary)]/28 outline-none transition-colors focus:border-[var(--color-accent)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]/40"
          placeholder="you@example.com"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-text-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap"
          disabled={status === 'submitting'}
          type="submit"
        >
          {status === 'submitting' ? 'Joining…' : 'Join Waitlist'}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-300" role="alert">
          Something went wrong. Try again in a moment.
        </p>
      )}
    </form>
  );
}

// ─── Waitlist section ─────────────────────────────────────────────────────────

const PLATFORMS = ['ESPN', 'Yahoo', 'Sleeper', 'Not sure yet'];

function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    try {
      await apiFetch('/api/waitlist', {
        method: 'POST',
        body: { email, platform: platform || null },
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section
      className="relative mx-auto max-w-7xl scroll-mt-20 px-5 pb-24"
      id="waitlist"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-accent)]/22 bg-[var(--color-surface-1)] p-8 shadow-2xl shadow-black/60 md:p-12">
        {/* Atmospheric glows */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[var(--color-risk-high)]/10 blur-3xl" />

        <div className="relative mx-auto max-w-xl text-center">
          {/* Raven detail — subtle brand personality */}
          <p aria-hidden="true" className="mb-1 text-sm text-[var(--color-accent)]/55">𖤍</p>

          <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)] md:text-3xl">
            Get the signal before launch.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-primary)]/52">
            Join the Omen waitlist for early access, product updates, and fantasy
            football tools as they go live.
          </p>

          {status === 'success' ? (
            <div className="mt-8 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 px-6 py-5">
              <p className="text-base font-semibold text-[var(--color-accent)]">
                You're on the list.
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-primary)]/60">
                The raven will send word.
              </p>
            </div>
          ) : (
            <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="flex flex-col gap-1 text-left">
                <label
                  className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-primary)]/40"
                  htmlFor="waitlist-email"
                >
                  Email address
                </label>
                <input
                  id="waitlist-email"
                  className="min-h-[44px] w-full rounded-md border border-white/12 bg-[var(--color-bg)] px-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-primary)]/28 outline-none transition-colors focus:border-[var(--color-accent)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]/40"
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Platform */}
              <fieldset>
                <legend className="mb-2 text-left text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-primary)]/40">
                  Your platform{' '}
                  <span className="normal-case text-[var(--color-text-primary)]/28">(optional)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <label
                      key={p}
                      className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        platform === p
                          ? 'border-[var(--color-accent)]/55 bg-[var(--color-accent)]/14 text-[var(--color-accent)]'
                          : 'border-white/14 bg-transparent text-[var(--color-text-primary)]/45 hover:border-white/28 hover:text-[var(--color-text-primary)]/70'
                      }`}
                    >
                      <input
                        checked={platform === p}
                        className="sr-only"
                        name="platform"
                        type="radio"
                        value={p}
                        onChange={() => setPlatform(p)}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Submit */}
              <button
                className="mt-1 inline-flex min-h-[46px] w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-text-on-accent)] transition-colors active:scale-[0.97] hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={status === 'submitting'}
                type="submit"
              >
                {status === 'submitting' ? 'Joining…' : 'Join the Waitlist'}
              </button>

              {status === 'error' && (
                <p className="text-xs text-red-300" role="alert">
                  Something went wrong. Try again in a moment.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <Header />

      <main className="relative overflow-hidden">
        {/*
          Background: multi-layer atmospheric radial gradients.
          The grid/box pattern has been intentionally removed — it read as
          distracting on screen. Pure gradient depth creates the premium feel.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 100% 55% at 50% -8%, rgba(201,164,76,0.13) 0%, transparent 58%)',
              'radial-gradient(circle at 15% 88%, rgba(110,30,43,0.10) 0%, transparent 42%)',
              'radial-gradient(circle at 88% 12%, rgba(201,164,76,0.06) 0%, transparent 32%)',
              'radial-gradient(circle at 50% 110%, rgba(201,164,76,0.05) 0%, transparent 45%)',
            ].join(','),
          }}
        />

        {/* ── Hero ── */}
        <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14">
          {/* Left: headline + waitlist */}
          <div className="animate-[fadeIn_0.6s_ease-out] motion-reduce:animate-none">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[var(--color-accent)]">
              Omen · Fantasy Intelligence
            </p>

            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.12] text-[var(--color-text-primary)] md:text-5xl lg:text-[3.25rem]">
              See the result
              <br />
              before it happens.
            </h1>

            <p className="mt-5 max-w-md text-[0.9375rem] leading-7 text-[var(--color-text-primary)]/58">
              Omen weighs your roster, matchup, player value, and season context
              — then gives you a plain-English accept, decline, or hold recommendation.
            </p>

            {/* Story arc */}
            <StoryArc />

            {/* Waitlist — primary CTA */}
            <HeroWaitlist />

            {/* Secondary: sign in + try live tool */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <SignInForm />
              <a
                className="mt-3 inline-flex min-h-[44px] items-center text-xs uppercase tracking-[0.24em] text-[var(--color-text-primary)]/38 transition-colors hover:text-[var(--color-text-primary)]/65"
                href="/about"
              >
                Try the live tool →
              </a>
            </div>
          </div>

          {/* Right: Trade Analyzer example */}
          <div className="animate-[fadeIn_0.6s_ease-out_0.12s_both] motion-reduce:animate-none">
            <TradeAnalyzerHeroCard />
          </div>
        </section>

        {/* ── Secondary feature cards ── */}
        <section
          className="relative mx-auto max-w-7xl scroll-mt-24 px-5 pb-16"
          id="secondary"
        >
          <div className="mb-8 border-t border-white/8 pt-10">
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-text-primary)]/32">
              More from Omen
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <OmenMiniCard />
            <DraftAssistantMiniCard />
          </div>
        </section>

        {/* ── Try it live bar ── */}
        <section className="relative mx-auto max-w-7xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-accent)]/22 bg-[var(--color-surface-1)] px-8 py-10 shadow-2xl shadow-black/60 md:px-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/7 blur-3xl" />
            <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p aria-hidden="true" className="text-sm text-[var(--color-accent)]/55">𖤍</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-[var(--color-text-primary)]">
                  Ready to run a real trade?
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-primary)]/45">
                  No account required. Omen analyzes any trade in seconds.
                </p>
              </div>
              <a
                className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)] px-7 text-sm font-semibold text-[var(--color-text-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.97]"
                href="/about"
              >
                Try the live tool →
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
