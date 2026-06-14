import TradeAnalyzer from './TradeAnalyzer.jsx';

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#050505]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-[#C9A44C]/40 bg-[#080604] shadow-[0_0_24px_rgba(201,164,76,0.14)]">
            <img alt="Corvus" className="h-full w-full object-cover" src="/corvus-apollo-logo.png" />
          </div>
          <span className="font-serif text-base tracking-[0.22em] text-[#F4EFE1]">CORVUS</span>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-5">
          <a
            className="text-xs uppercase tracking-[0.28em] text-[#F4EFE1]/45 transition-colors hover:text-[#F4EFE1]/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A44C] rounded-sm"
            href="/"
          >
            ← Slops Saloon
          </a>
          <a
            className="text-xs uppercase tracking-[0.28em] text-[#C9A44C]/80 transition-colors hover:text-[#C9A44C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A44C] rounded-sm"
            href="/login"
          >
            Sign In →
          </a>
        </div>
      </div>
    </header>
  );
}

// ─── Feature pills ────────────────────────────────────────────────────────────

const FEATURES = [
  { label: 'Omen of the Week', desc: 'One move. Every week.', pro: true },
  { label: 'Draft Assistant', desc: 'Know your pick before your turn.', pro: false },
  { label: 'Team Themes', desc: 'Your colors. Your interface.', pro: false },
];

function FeaturePitch() {
  return (
    <section className="border-t border-white/8 py-14">
      <div className="mx-auto max-w-4xl px-5">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.32em] text-[#C9A44C]/60">
          More from Corvus
        </p>
        <p className="mb-8 text-center text-lg font-semibold text-[#F4EFE1]">
          The trade check is free. Everything else is Pro.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="relative rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4"
            >
              {f.pro && (
                <span className="absolute right-3 top-3 rounded-full border border-[#C9A44C]/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#C9A44C]/70">
                  Pro
                </span>
              )}
              <p className="text-sm font-semibold text-[#F4EFE1]">{f.label}</p>
              <p className="mt-1 text-xs leading-5 text-[#F4EFE1]/45">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[#C9A44C] px-7 text-sm font-semibold text-black transition-colors hover:bg-[#dbb95a] active:scale-[0.97]"
            href="/login"
          >
            Sign up free →
          </a>
          <a
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-white/15 px-7 text-sm font-semibold text-[#F4EFE1]/70 transition-colors hover:bg-white/8"
            href="/login"
          >
            Sign in to your account
          </a>
        </div>

        <p className="mt-5 text-center text-xs text-[#F4EFE1]/28">
          No credit card required · 7-day Pro trial included
        </p>
      </div>
    </section>
  );
}

// ─── Corvus landing page ──────────────────────────────────────────────────────

export default function CorvusLanding() {
  return (
    <div className="min-h-[100dvh] bg-[#050505] text-[#F4EFE1]">
      <Header />

      <main className="relative overflow-hidden">
        {/* Atmospheric glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(201,164,76,0.11) 0%, transparent 55%)',
              'radial-gradient(circle at 85% 85%, rgba(110,30,43,0.08) 0%, transparent 40%)',
            ].join(','),
          }}
        />

        {/* ── Hero ── */}
        <section className="relative mx-auto max-w-4xl px-5 pb-12 pt-12 md:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#C9A44C]">
            Corvus · Trade Analyzer
          </p>
          <h1 className="mt-3 font-sans text-3xl font-semibold leading-tight tracking-[-0.01em] text-[#F4EFE1] md:text-4xl">
            Know the move before you make it.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#F4EFE1]/50">
            No account required. Pick a position, type a name, hit Compare — Corvus does the rest.
          </p>

          {/* Working Trade Analyzer — compact mode, no sidebar */}
          <div className="mt-8">
            <TradeAnalyzer compact />
          </div>
        </section>

        {/* ── Feature pitch ── */}
        <FeaturePitch />
      </main>
    </div>
  );
}
