import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import AppLayout from '../components/layout/AppLayout.jsx';
import DisconnectedState from '../components/ui/DisconnectedState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { NFL_TEAMS } from '../data/nflTeams.js';
import { apiFetch } from '../lib/api.js';
import { PRIVATE_FIXTURE_KEYS, getPrivateFixtureKey } from '../lib/privateFixtureMode.js';
import { useTheme } from '../lib/themeMode.js';
import OmenOfTheWeek from './OmenOfTheWeek.jsx';

function OmenHeader() {
  const { mode, team: teamAbbr } = useTheme();
  const cry = useMemo(() => {
    if (mode !== 'team' || !teamAbbr) return null;
    return NFL_TEAMS.find((t) => t.abbr === teamAbbr)?.cry ?? null;
  }, [mode, teamAbbr]);

  return (
    <section className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">
        Omen
      </p>
      {cry && (
        <p
          className="mt-1.5 font-sans text-[11px] font-semibold uppercase"
          style={{ color: 'var(--color-team-accent)', letterSpacing: '0.18em', opacity: 0.7 }}
        >
          {cry}
        </p>
      )}
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl" style={{ color: 'var(--color-text-primary)' }}>
        Omen of the Week
      </h1>
      <p className="mt-4 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
        Your single highest-value move — start/sit, waiver, or trade — distilled into
        one plain-English call each week.
      </p>
    </section>
  );
}

function LoadingGate() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none">
      <div className="h-5 w-32 rounded-md" style={{ background: 'var(--color-surface-2)' }} />
      <div className="h-8 w-64 rounded-md" style={{ background: 'var(--color-surface-2)' }} />
      <div className="h-48 rounded-xl" style={{ background: 'var(--color-surface-2)' }} />
    </div>
  );
}

export default function OmenPage() {
  const fixtureKey = getPrivateFixtureKey();
  const omenFixtureActive = fixtureKey === PRIVATE_FIXTURE_KEYS.OMEN_ROSTER;
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(!omenFixtureActive);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (omenFixtureActive) {
      setLoading(false);
      setFetchFailed(false);
      return undefined;
    }
    let mounted = true;
    apiFetch('/api/dashboard/summary')
      .then((data) => { if (mounted) setSummary(data); })
      .catch(() => { if (mounted) setFetchFailed(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [omenFixtureActive]);

  const omenStatus = summary?.tools?.omen_of_the_week?.status;

  function renderContent() {
    if (omenFixtureActive) return <OmenOfTheWeek />;

    if (loading) return <LoadingGate />;

    if (omenStatus === 'needs_platform') {
      return (
        <DisconnectedState
          eyebrow="Omen of the Week"
          title="Connect a fantasy platform"
          message="Link Yahoo, Sleeper, or ESPN so Omen can read your roster and produce your weekly move."
          ctaLabel="Connect a platform"
          ctaHref="/account/connect"
        />
      );
    }

    if (omenStatus === 'pending_live_engine') {
      return (
        <EmptyState
          eyebrow="Omen of the Week"
          title="Platform connected"
          message="Your platform is connected. Live recommendations are being prepared — check back soon."
        />
      );
    }

    // status === 'ready' or summary fetch failed (OmenOfTheWeek handles its own backend states)
    return <OmenOfTheWeek />;
  }

  return (
    <AppLayout>
      <OmenHeader />

      {renderContent()}

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          className="inline-flex min-h-[44px] items-center rounded-sm text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
          to="/football"
        >
          ← Back to dashboard
        </Link>
      </div>
    </AppLayout>
  );
}
