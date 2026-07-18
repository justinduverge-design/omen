import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LeagueStandings from '../components/league/LeagueStandings.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import MoveHistory from '../components/moves/MoveHistory.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import DisconnectedState from '../components/ui/DisconnectedState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import TabNav from '../components/ui/TabNav.jsx';
import { NFL_TEAMS } from '../data/nflTeams.js';
import { apiFetch } from '../lib/api.js';
import { setDataMode } from '../lib/dataMode.js';
import {
  getPostWinSignal,
  hasSeenPostWinGameId,
  markPostWinGameIdSeen,
  teamWinLabel,
} from '../lib/postWinPulse.js';
import { useTheme } from '../lib/themeMode.js';
import { startYahooOAuth } from '../lib/yahooAuth.js';
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
  const [reconnecting, setReconnecting] = useState(null);
  const [reconnectError, setReconnectError] = useState(null);

  if (loading) {
    return <div className="h-10 animate-pulse motion-reduce:animate-none rounded-lg" style={{ background: 'var(--color-surface-2)' }} />;
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
        <Alert tone="neutral" className="justify-between">
          <p>No fantasy platform connected.</p>
          <Link
            className="text-xs font-semibold transition-colors"
            style={{ color: 'var(--color-team-accent)' }}
            to="/account"
          >
            Connect a platform →
          </Link>
        </Alert>
      ) : connected.length > 0 ? (
        <Alert tone="neutral">
          <p>Connected:</p>
          {connected.map(([key, val]) => {
            const label = PLATFORM_LABELS[key] ?? key;
            const suffix = key === 'sleeper' && val?.username ? ` · ${val.username}` : '';
            return (
              <Badge key={key} tone="success">
                {label}{suffix}
              </Badge>
            );
          })}
          <Link
            className="ml-auto text-xs transition-colors hover:text-[var(--color-text-primary)]"
            to="/account"
          >
            Manage
          </Link>
        </Alert>
      ) : null}

      {tokenExpired.map(([key]) => {
        const label = PLATFORM_LABELS[key] ?? key;
        const canReconnect = key === 'yahoo';
        return (
          <Alert key={key} tone="omen" className="justify-between" style={{ color: 'var(--color-text-primary)' }}>
            <p>{label} session expired — reconnect to restore your live data</p>
            {canReconnect && (
              <Button
                variant="link"
                size="sm"
                className="ml-4 inline-flex min-h-[44px] shrink-0 items-center text-xs font-semibold transition-colors"
                disabled={reconnecting === key}
                onClick={async () => {
                  setReconnectError(null);
                  setReconnecting(key);
                  try {
                    await startYahooOAuth();
                  } catch (error) {
                    setReconnectError(error.message || `Could not reconnect ${label}. Try again.`);
                    setReconnecting(null);
                  }
                }}
              >
                {reconnecting === key ? 'Reconnecting...' : `Reconnect ${label} →`}
              </Button>
            )}
            {reconnectError ? (
              <p className="ml-4" style={{ color: 'var(--color-risk-high)' }}>
                {reconnectError}
              </p>
            ) : null}
          </Alert>
        );
      })}
    </div>
  );
}

export default function Football() {
  const [activeTab, setActiveTab] = useState('trade');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [postWinWashActive, setPostWinWashActive] = useState(false);
  const { mode, team: teamAbbr } = useTheme();
  const themedTeam = useMemo(() => (
    teamAbbr ? NFL_TEAMS.find((t) => t.abbr === teamAbbr) ?? null : null
  ), [teamAbbr]);
  const postWinTeam = useMemo(() => {
    const favoriteTeam = summary?.user?.favorite_team;
    const abbr = favoriteTeam || teamAbbr;
    return abbr ? NFL_TEAMS.find((t) => t.abbr === abbr) ?? null : null;
  }, [summary?.user?.favorite_team, teamAbbr]);
  const cultureTag = useMemo(() => {
    if (mode !== 'team' || !themedTeam) return null;
    return themedTeam.cultureTag ?? null;
  }, [mode, themedTeam]);

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
  const postWinSignal = useMemo(
    () => getPostWinSignal(summary?.platforms),
    [summary?.platforms],
  );

  useEffect(() => {
    if (summaryLoading || !postWinSignal?.lastGameId) return undefined;
    if (hasSeenPostWinGameId(postWinSignal.lastGameId)) return undefined;

    markPostWinGameIdSeen(postWinSignal.lastGameId);
    setPostWinWashActive(true);
    const timeoutId = window.setTimeout(() => setPostWinWashActive(false), 850);
    return () => window.clearTimeout(timeoutId);
  }, [postWinSignal?.lastGameId, summaryLoading]);

  useEffect(() => {
    const root = document.documentElement;
    if (!postWinWashActive) {
      root.removeAttribute('data-post-win-wash');
      return undefined;
    }
    root.setAttribute('data-post-win-wash', 'true');
    return () => root.removeAttribute('data-post-win-wash');
  }, [postWinWashActive]);

  // Phase 1.5g.3: a connected platform means real league data is on screen →
  // 'live' (moment chrome suppressed). No connection / off-season → 'mock'.
  // Stays unset (fail closed) until the summary resolves.
  const connectedCount = useMemo(() => {
    const p = summary?.platforms;
    if (!p) return 0;
    return Object.entries(p).filter(([key, v]) => key !== 'connections' && v?.connected).length;
  }, [summary]);

  useEffect(() => {
    if (summaryLoading) return undefined;
    setDataMode(connectedCount > 0 ? 'live' : 'mock');
    return () => setDataMode(null);
  }, [summaryLoading, connectedCount]);

  function renderTab(id) {
    switch (id) {
      case 'draft':
        return <DraftAssistant platforms={summary?.platforms} />;

      case 'omen':
        if (summaryLoading) {
          return <div className="h-32 animate-pulse motion-reduce:animate-none rounded-xl" style={{ background: 'var(--color-surface-2)' }} />;
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-team-accent)' }}>
            Omen · Hall of Records
          </p>
          {cultureTag && (
            <span
              className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
              style={{
                color: 'var(--color-team-accent)',
                borderColor: 'color-mix(in srgb, var(--color-team-accent) 40%, var(--color-border) 60%)',
              }}
            >
              {cultureTag}
            </span>
          )}
          {postWinSignal && (
            <span
              className="post-win-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
              aria-label={teamWinLabel(postWinTeam)}
            >
              <span aria-hidden="true">✦</span>
              <span>{teamWinLabel(postWinTeam)}</span>
            </span>
          )}
        </div>
        <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl" style={{ color: 'var(--color-text-primary)' }}>
          Hall of Records
        </h1>
        <p className="mt-4 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
          Start with a trade check, prepare for the draft, then let Omen of the Week fold
          start/sit and waiver choices into one plain-English weekly move.
        </p>
      </section>

      <PlatformStatusBar platforms={summary?.platforms} loading={summaryLoading} />

      <LeagueStandings postWinActive={Boolean(postWinSignal)} />

      {/* Horizontally scrollable on mobile so tabs never wrap to a second line */}
      <TabNav
        value={activeTab}
        onValueChange={setActiveTab}
        aria-label="Football tools"
        className="-mb-px overflow-x-auto"
      >
        {TABS.map((tab) => (
          <TabNav.Item
            key={tab.id}
            value={tab.id}
            aria-controls={`tab-panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className="shrink-0 px-4 text-sm font-semibold"
          >
            {tab.label}
          </TabNav.Item>
        ))}
      </TabNav>

      <section
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {renderTab(activeTab)}
      </section>
    </AppLayout>
  );
}
