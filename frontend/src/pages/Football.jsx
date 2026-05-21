import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import DisconnectedState from '../components/ui/DisconnectedState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { apiFetch } from '../lib/api.js';
import DraftAssistant from './DraftAssistant.jsx';
import OmenOfTheWeek from './OmenOfTheWeek';
import StartSit from './StartSit';
import TradeAnalyzer from './TradeAnalyzer';
import WaiverWire from './WaiverWire';

const TABS = [
  { id: 'draft', label: 'Draft Assistant' },
  { id: 'omen', label: 'Omen of the Week' },
  { id: 'trade', label: 'Trade Analyzer' },
  { id: 'start-sit', label: 'Start/Sit' },
  { id: 'waiver', label: 'Waiver Wire' },
];

const PLATFORM_LABELS = { yahoo: 'Yahoo', sleeper: 'Sleeper', espn: 'ESPN' };

function PlatformStatusBar({ platforms, loading }) {
  if (loading) {
    return <div className="h-10 animate-pulse rounded-lg bg-slate-800/50" />;
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
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
          <p className="text-xs text-slate-400">No fantasy platform connected.</p>
          <Link
            className="text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
            to="/account"
          >
            Connect a platform →
          </Link>
        </div>
      ) : connected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2.5">
          <p className="text-xs text-slate-500">Connected:</p>
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
            className="ml-auto text-xs text-slate-500 transition-colors hover:text-slate-300"
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
            className="flex items-center justify-between rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3"
          >
            <p className="text-xs text-amber-300">
              {label} session expired — reconnect to restore your live data
            </p>
            {reconnectUrl && (
              <button
                className="ml-4 shrink-0 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
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
  const [activeTab, setActiveTab] = useState('draft');
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
  const waiverStatus = tools?.waiver_wire?.status;

  function renderTab(id) {
    switch (id) {
      case 'draft':
        return <DraftAssistant platforms={summary?.platforms} />;

      case 'omen':
        if (summaryLoading) {
          return <div className="h-32 animate-pulse rounded-xl bg-slate-800/50" />;
        }
        if (omenStatus === 'needs_platform') {
          return (
            <DisconnectedState
              eyebrow="Omen of the Week"
              title="Connect a fantasy platform"
              message="Link Yahoo, Sleeper, or ESPN to receive your personalized weekly omen."
            />
          );
        }
        if (omenStatus === 'pending_live_engine') {
          return (
            <EmptyState
              eyebrow="Omen of the Week"
              title="Platform connected"
              message="Your platform is connected. Live recommendations are being activated — check back soon."
            />
          );
        }
        return <OmenOfTheWeek />;

      case 'trade':
        return <TradeAnalyzer />;

      case 'start-sit':
        return <StartSit />;

      case 'waiver':
        if (summaryLoading) {
          return <div className="h-32 animate-pulse rounded-xl bg-slate-800/50" />;
        }
        if (waiverStatus === 'needs_platform') {
          return (
            <DisconnectedState
              eyebrow="Waiver Wire"
              title="Connect Yahoo to access waiver picks"
              message="Waiver wire rankings require a linked Yahoo account. Connect Yahoo to unlock VORP-ranked pickups for your roster."
            />
          );
        }
        if (waiverStatus === 'needs_subscription') {
          return (
            <EmptyState
              eyebrow="Pro Feature"
              title="Waiver Wire Optimizer"
              message="Waiver wire rankings require a Corvus Pro subscription. Upgrade to access VORP-ranked pickups for your roster."
              cta={{ href: '/account', label: 'Upgrade to Pro' }}
            />
          );
        }
        return <WaiverWire />;

      default:
        return null;
    }
  }

  return (
    <AppLayout>
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Corvus · Hall of Records
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-wide text-white sm:text-5xl">
          Hall of Records
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Your weekly omen, lineup decisions, and trade intelligence — grounded in defensible math.
        </p>
      </section>

      <PlatformStatusBar platforms={summary?.platforms} loading={summaryLoading} />

      {/* Horizontally scrollable on mobile so tabs never wrap to a second line */}
      <div className="-mb-px flex overflow-x-auto border-b border-slate-800">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={[
                'shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-white',
              ].join(' ')}
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
