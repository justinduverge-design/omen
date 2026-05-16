const dashboardCards = [
  { label: 'Projected Swing', value: '+6.8 pts' },
  { label: 'Confidence', value: '82%' },
  { label: 'Risk', value: 'Medium' },
  { label: 'Deadline', value: 'Sun 12:55 PM' },
];

function Button({ children, className = '', disabled = false, href }) {
  const sharedClassName = [
    'inline-flex min-h-11 items-center justify-center rounded-md px-7 text-sm font-semibold transition-colors',
    disabled ? 'cursor-default opacity-55' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <a className={sharedClassName} href={href}>
        {children}
      </a>
    );
  }

  return (
    <button className={sharedClassName} disabled={disabled} type="button">
      {children}
    </button>
  );
}

function ChevronRight() {
  return (
    <span aria-hidden="true" className="ml-2 text-base leading-none">
      →
    </span>
  );
}

function CorvusLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 overflow-hidden rounded-full border border-[#C9A44C]/45 bg-[#080604] shadow-[0_0_40px_rgba(201,164,76,0.18)]">
        <img
          alt="Corvus Apollo logo"
          className="h-full w-full object-cover"
          src="/corvus-apollo-logo.png"
        />
      </div>

      <div className="font-serif text-xl tracking-[0.22em] text-[#F4EFE1]">
        CORVUS
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <CorvusLogo />
        <div className="text-xs uppercase tracking-[0.28em] text-[#C9A44C]/80">
          Coming Soon
        </div>
      </div>
    </header>
  );
}

function OmenCard() {
  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-[#C9A44C]/25 bg-[#101010]/90 shadow-2xl shadow-black/60"
      id="omen-preview"
    >
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#C9A44C]/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-[#6E1E2B]/18 blur-3xl" />

      <div className="relative p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#C9A44C]">
              Omen of the Week
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-[#F4EFE1]">
              Strike the waiver wire
            </h3>
          </div>
          <div className="rounded-full border border-[#C9A44C]/30 px-3 py-1 text-xs text-[#C9A44C]">
            Example
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080604]/70 p-5">
          <p className="text-sm text-[#F4EFE1]/60">Recommended move</p>
          <p className="mt-2 text-xl font-semibold text-[#F4EFE1]">
            Add RB Jaylen Warren and start him at FLEX.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#F4EFE1]/65">
            Corvus detected a cleaner matchup path, increased opportunity share,
            and a higher floor than your current FLEX option.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {dashboardCards.map((card) => (
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              key={card.label}
            >
              <p className="text-xs text-[#F4EFE1]/45">{card.label}</p>
              <p className="mt-1 text-lg font-semibold text-[#F4EFE1]">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            className="bg-[#C9A44C] text-black hover:bg-[#F4EFE1]"
            disabled
          >
            Accept Omen
          </Button>
          <Button
            className="border border-white/15 bg-transparent text-[#F4EFE1] hover:bg-white/10"
            disabled
          >
            Explain more
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#F4EFE1]">
      <Header />

      <main className="relative overflow-hidden px-5 py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,164,76,0.16),transparent_35%),radial-gradient(circle_at_70%_25%,rgba(110,30,43,0.16),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(201,164,76,0.08),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(244,239,225,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(244,239,225,0.06) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <section className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="animate-[fadeIn_0.7s_ease-out]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C9A44C]">
              Coming Soon
            </p>
            <h1 className="mt-5 font-serif text-6xl leading-none tracking-[0.18em] text-[#F4EFE1] md:text-8xl">
              CORVUS
            </h1>
            <p className="mt-6 text-sm uppercase tracking-[0.34em] text-[#C9A44C]">
              Deus pascit corvos
            </p>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#F4EFE1]/70">
              A fantasy football intelligence layer built to study your roster,
              read the matchup, and surface the move that matters.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                className="bg-[#C9A44C] text-black hover:bg-[#F4EFE1]"
                href="mailto:hello@slopssaloon.com?subject=Corvus%20notify%20me"
              >
                Notify Me <ChevronRight />
              </Button>
              <Button
                className="border border-white/15 bg-transparent text-[#F4EFE1] hover:bg-white/10"
                href="#omen-preview"
              >
                Preview Omen
              </Button>
            </div>
          </div>

          <div className="animate-[fadeIn_0.7s_ease-out_0.1s_both]">
            <OmenCard />
          </div>
        </section>
      </main>
    </div>
  );
}
