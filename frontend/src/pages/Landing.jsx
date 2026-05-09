import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const PILLARS = [
  {
    title: 'Trade Analyzer',
    description:
      'Compare trade offers side-by-side using VORP-based player valuation. Know what you are giving up and what you are getting — before you accept.',
    status: 'Available',
    statusStyle: 'bg-emerald-400/10 text-emerald-400',
  },
  {
    title: 'Start / Sit',
    description:
      'Lineup optimization grounded in matchup data and projected output. The right call, defensibly made.',
    status: 'In development',
    statusStyle: 'bg-slate-700 text-slate-400',
  },
  {
    title: 'Waiver Wire',
    description:
      'Surface high-value pickups before the rest of your league sees them. Priority built on math, not name recognition.',
    status: 'In development',
    statusStyle: 'bg-slate-700 text-slate-400',
  },
];

const FUTURE_MODULES = [
  {
    name: 'Slops Finance',
    description: 'Personal finance tools built on the same data discipline.',
  },
  {
    name: 'Slops Academy',
    description: 'Sports and academic development for families.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-6 py-20">

        {/* ── Hero ────────────────────────────────────────── */}
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Fantasy Football Decision Intelligence
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-white sm:text-7xl">
            Slops Saloon
          </h1>
          <p className="mt-3 text-base italic text-slate-400">
            Where the math meets the legend.
          </p>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            A platform for fantasy sports decisions built on defensible math
            and privacy-first design. The principle is simple: a good tool
            should feel obvious the first time you use it.
          </p>
          <div className="mt-10">
            <a
              href="/football"
              className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300"
            >
              Open Trade Analyzer <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* ── Active Module ────────────────────────────────── */}
        <section>
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Active Module
          </p>
          <div className="flex flex-col gap-6 rounded-xl border border-amber-400/20 bg-slate-900 p-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="mb-3 inline-block rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                Active
              </span>
              <h2 className="text-xl font-semibold text-white">
                Slops Saloon Football
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Trade analysis, lineup decisions, and waiver intelligence —
                grounded in defensible math, not gut instinct. Connects to your
                Yahoo Fantasy league.
              </p>
            </div>
            <a
              href="/football"
              className="mt-2 shrink-0 self-start rounded-md border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-400 transition-colors hover:border-amber-400 hover:bg-amber-400/5 sm:mt-0"
            >
              Open App →
            </a>
          </div>
        </section>

        {/* ── Decision Intelligence ────────────────────────── */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Decision Intelligence
          </p>
          <h2 className="mb-8 text-2xl font-semibold text-white">
            Built for better calls
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-lg border border-slate-800 bg-slate-900 p-6"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${pillar.statusStyle}`}
                  >
                    {pillar.status}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Pricing
          </p>
          <h2 className="mb-6 text-2xl font-semibold text-white">
            Start for free
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-amber-400/20 bg-slate-950 p-6">
              <p className="text-sm font-semibold text-amber-400">
                Saddlebag — Free
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>10 trade comparisons per day</li>
                <li>Yahoo Fantasy account required</li>
                <li>Full access to Slops Saloon Football</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-6">
              <p className="text-sm font-semibold text-slate-400">More plans</p>
              <p className="mt-4 text-sm italic text-slate-500">
                Additional tiers are in development. Pricing has not been
                finalized.
              </p>
            </div>
          </div>
        </section>

        {/* ── Community — no dead links ─────────────────────── */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Community &amp; Content
          </p>
          <h2 className="mb-4 text-2xl font-semibold text-white">
            Coming to the Saloon
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            A Discord community, podcast feed, and content hub are planned. No
            links appear here until they are real and active. Check back as the
            platform matures.
          </p>
        </section>

        {/* ── Future modules — locked, not clickable ────────── */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Coming to Slops OS
          </p>
          <h2 className="mb-6 text-2xl font-semibold text-slate-500">
            Future modules
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FUTURE_MODULES.map((mod) => (
              <div
                key={mod.name}
                aria-label={`${mod.name} — not yet available`}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 opacity-50"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-400">
                    {mod.name}
                  </span>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-500">
                    Future
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  {mod.description}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
