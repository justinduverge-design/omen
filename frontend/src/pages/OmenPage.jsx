import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import DisconnectedState from '../components/ui/DisconnectedState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import UpgradeState from '../components/ui/UpgradeState.jsx';
import { apiFetch } from '../lib/api.js';
import OmenOfTheWeek from './OmenOfTheWeek.jsx';

function OmenHeader() {
  return (
    <section className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
        Corvus Pro
      </p>
      <h1 className="mt-3 font-serif text-4xl tracking-wide sm:text-5xl" style={{ color: 'var(--color-text-primary)' }}>
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
    <div className="space-y-4 animate-pulse">
      <div className="h-5 w-32 rounded-md" style={{ background: 'var(--color-surface-2)' }} />
      <div className="h-8 w-64 rounded-md" style={{ background: 'var(--color-surface-2)' }} />
      <div className="h-48 rounded-xl" style={{ background: 'var(--color-surface-2)' }} />
    </div>
  );
}

export default function OmenPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/dashboard/summary')
      .then((data) => { if (mounted) setSummary(data); })
      .catch(() => { if (mounted) setFetchFailed(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const omenStatus = summary?.tools?.omen_of_the_week?.status;

  function renderContent() {
    if (loading) return <LoadingGate />;

    if (omenStatus === 'needs_platform') {
      return (
        <DisconnectedState
          eyebrow="Omen of the Week"
          title="Connect a fantasy platform"
          message="Link Yahoo, Sleeper, or ESPN so Corvus can read your roster and produce your weekly move."
          ctaLabel="Connect a platform"
          ctaHref="/account/connect"
        />
      );
    }

    if (omenStatus === 'needs_subscription') {
      return (
        <UpgradeState
          eyebrow="Omen of the Week"
          title="Corvus Pro required"
          message="Most Valuable Play is a Pro feature. Upgrade to unlock your personalized weekly move."
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
          className="rounded-sm text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          to="/football"
        >
          ← Back to dashboard
        </Link>
      </div>
    </AppLayout>
  );
}
