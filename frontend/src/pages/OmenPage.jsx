import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import DisconnectedState from '../components/ui/DisconnectedState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Button, PageHero } from '../components/ui/index.js';
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
    <PageHero
      eyebrow={cry ? `OMEN · ${cry}` : 'OMEN'}
      title="Omen of the Week"
      subtitle="Your single highest-value move — start/sit, waiver, or trade — distilled into one plain-English call each week."
    />
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
        <Button variant="link" asChild>
          <Link to="/football">← Back to dashboard</Link>
        </Button>
      </div>
    </AppLayout>
  );
}
