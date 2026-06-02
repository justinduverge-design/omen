import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LeagueStandings from '../components/league/LeagueStandings.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import MoveHistory from '../components/moves/MoveHistory.jsx';
import DisconnectedState from '../components/ui/DisconnectedState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import UpgradeState from '../components/ui/UpgradeState.jsx';
import { apiFetch } from '../lib/api.js';
import DraftAssistant from './DraftAssistant.jsx';
import OmenOfTheWeek from './OmenOfTheWeek';
import TradeAnalyzer from './TradeAnalyzer';

const TABS = [
  { id: 'trade', label: 'Trade Analyzer' },
  { id: 'omen', label: 'Omen of the Week' },
  { id: 'draft', label: 'Draft Assistant' },
  { id: 'history', label: 'History' },
];

const PLATFORM_LABELS = { yahoo: 'Yahoo', sleeper: 'Sleeper', espn: 'ESPN' };

function PlatformStatusBar({ platforms, loading }) {
  if (loading) {
    return <div className="h-10 animate-pulse rounded-lg" style={{ background: 'var(--color-surface-2)' }} />;
  }
  if (!platforms) return null;

  const connected = Object.entries(platforms).filter(
    ([key, v]) => key !== 'connections' && v?.connected,
  );

  const tokenExpired = Object.entries(platforms).filter(
    ([key, v]) => key !== 'connections' && v?.status === 'token_expired',
  );

  return (
    <div className="space-y-2">
      {connected.length === 0 && tokenExpired.length === 0 ? (
        <div className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No fantasy platform connected.</p>
          <Link
            className="text-xs font-semibold transition-colors"
            style={{ color: 'var(--color-accent)' }}
            to="/account"
          >
            Connect a platform →
          </Link>
        </div>
      ) : connected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Connected:</p>
          {connected.map(([key, val]) => {
            const label = PLATFORM_LABELS[key] ?? key;
            const suffix = key === 'sleeper' && val?.username ? ` · ${val.username}` : '';
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {label}{suffix}
              </span>
            );
          })}
          <Link
            className="ml-auto text-xs transition-colors hover:text-[var(--color-text-primary)]"
            style={{ color: 'var(--color-text-secondary)' }}
            to="/account"
          >
            Manage
          </Link>
        </div>
      ) : null}

      {tokenExpired.map(([key]) => {
        const label = PLATFORM_LABELS[key] ?? key;
        const reconnectUrl = key === 'yahoo' ? '/api/yahoo/auth' : null;
        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-muted)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
              {label} session expired — reconnect to restore your live data
            </p>
            {reconnectUrl && (
              <button
                className="ml-4 shrink-0 text-xs font-semibold transition-colors"
                style={{ color: 'var(--color-accent)' }}
                type="button"
                onClick={() => { window.location.href = reconnectUrl; }}
              >
                Reconnect {label} →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Football() {
  const [activeTab, setActiveTab] = useState('trade');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/dashboard/summary')
      .then((data) => { if (mounted) setSummary(data); })
      .catch(() => { /* fail silently — tabs degrade to self-managed states */ })
      .finally(() => { if (mounted) setSummaryLoading(false); });
    return () => { mounted = false; };
  }, []);

  const tools = summary?.tools;
  const omenStatus = tools?.omen_of_the_week?.status;

  function renderTab(id) {
    switch (id) {
      case 'draft':
        return <DraftAssistant platforms={summary?.platforms} />;

      case 'omen':
        if (summaryLoading) {
          return <div className="h-32 animate-pulse rounded-xl" style={{ background: 'var(--color-surface-2)' }} />;
        }
        if (omenStatus === 'needs_platform') {
          return (
            <DisconnectedState
              eyebrow="Omen of the Week"
              title="Connect a fantasy platform"
              message="Link Yahoo, Sleeper, or ESPN to receive your personalized weekly omen."
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
        if (omenStatus === 'ready') {
          return <OmenOfTheWeek />;
        }
        // Summary unavailable — OmenOfTheWeek handles its own backend states
        return <OmenOfTheWeek />;

      case 'trade':
        return <TradeAnalyzer />;

      case 'history':
        return <MoveHistory />;

      default:
        return null;
    }
  }

  return (
    <AppLayout>
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
          Corvus · Hall of Records
        </p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl" style={{ color: 'var(--color-text-primary)' }}>
          Hall of Records
        </h1>
        <p className="mt-4 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
          Start with a trade check, prepare for the draft, then let Omen of the Week fold
          start/sit and waiver choices into one plain-English weekly move.
        </p>
      </section>

      <PlatformStatusBar platforms={summary?.platforms} loading={summaryLoading} />

      <LeagueStandings />

      {/* Horizontally scrollable on mobile so tabs never wrap to a second line */}
      <div className="-mb-px flex overflow-x-auto border-b" style={{ borderColor: 'var(--color-border)' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors"
              style={
                isActive
                  ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                  : { borderColor: 'transparent', color: 'var(--color-text-secondary)' }
              }
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section>{renderTab(activeTab)}</section>
    </AppLayout>
  );
}
