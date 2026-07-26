/**
 * Demo.jsx — Phase 2.7 public `/demo` route.
 *
 * Renders the deterministic `omen-demo.v1` fixture from `GET /api/demo` using
 * the shared <OmenRecommendationView>. Per `Blueprints/demo-mode.md`:
 *  - Persistent, non-dismissible Demo Mode label in view.
 *  - Demo state is its own product state — never silently merges with a
 *    connected league. The conversion CTA is "Connect a league".
 *  - No HITL feedback, no analytics events from the demo render.
 *
 * No auth required. No Supabase, no platform, no LLM is touched on this path
 * (the backend service is similarly isolated).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import AppLayout from '../components/layout/AppLayout.jsx';
import { ApiError, apiFetch } from '../lib/api.js';
import { setDataMode } from '../lib/dataMode.js';
import { OmenRecommendationView } from './OmenOfTheWeek.jsx';

function DemoBanner({ notice }) {
  const label = notice?.label ?? 'Demo Mode';
  const message = notice?.message
    ?? 'Sample league and roster data. This is not live fantasy advice.';
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-md border border-sky-400/30 bg-sky-400/5 px-3.5 py-3 text-xs"
      style={{ color: 'var(--color-demo-text)' }}
    >
      <span aria-hidden="true" className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
      <div>
        <p className="font-semibold uppercase tracking-widest">{label}</p>
        <p
          className="mt-0.5 leading-5"
          style={{ color: 'var(--color-demo-text-secondary)' }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

function DemoHeader() {
  return (
    <section className="max-w-2xl">
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-demo-text)' }}
      >
        Omen Demo
      </p>
      <h1
        className="mt-3 font-display text-4xl font-semibold sm:text-5xl"
        style={{ color: 'var(--color-text-primary)' }}
      >
        See Omen on a sample league.
      </h1>
      <p
        className="mt-4 text-sm leading-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        This is a fixed example so you can read the shape of an Omen call before
        you connect your own league. Numbers and rosters here are illustrative —
        the real version reads your roster from Yahoo, Sleeper, or ESPN.
      </p>
    </section>
  );
}

function LoadingGate() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-busy="true">
      <div className="h-5 w-32 rounded-md bg-slate-800" />
      <div className="h-8 w-64 rounded-md bg-slate-800" />
      <div className="h-48 rounded-xl bg-slate-800" />
    </div>
  );
}

function ErrorBlock({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6">
      <p className="text-sm font-semibold text-red-300">
        Demo Mode is temporarily unavailable
      </p>
      <p className="mt-1 text-sm text-red-200/70">{message}</p>
      <button
        className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-red-400/20 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-400/30"
        type="button"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  );
}

function ConversionFooter() {
  return (
    <section
      className="rounded-xl border px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-surface-1)',
      }}
    >
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-demo-text)' }}
        >
          Ready for the real call?
        </p>
        <p
          className="mt-1 text-sm leading-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Connect Yahoo, Sleeper, or ESPN and Omen reads your actual roster.
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:flex-row">
        <Link
          to="/account/connect"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--color-team-accent)] px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
        >
          Connect a league
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}

function useDemoData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch('/api/demo')
      .then((result) => setData(result))
      .catch((err) => {
        const msg = err instanceof ApiError
          ? err.message
          : 'Could not load the demo payload. Please try again.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  return { data, loading, error, retry: load };
}

export default function Demo() {
  const { data, loading, error, retry } = useDemoData();

  // Declare the route's data mode for <MomentChrome> and any chrome consumers.
  // Demo is its own mode (allowed alongside 'mock'); fail-closed cultural
  // moments stay suppressed because `/demo` isn't in ROUTE_SCOPES.
  useEffect(() => {
    setDataMode('demo');
    return () => setDataMode(null);
  }, []);

  return (
    <AppLayout>
      <DemoHeader />

      {/* Persistent Demo Mode label — kept above any render state so it's
          always in view per Blueprints/demo-mode.md §Visible labeling. */}
      <DemoBanner notice={data?.demo_notice} />

      {loading && <LoadingGate />}
      {error && !loading && <ErrorBlock message={error} onRetry={retry} />}
      {data?.omen && !loading && !error && (
        <OmenRecommendationView
          data={data.omen}
          showFeedback={false}
          banner={null}
        />
      )}

      <ConversionFooter />
    </AppLayout>
  );
}
