import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { Button, Card, Chip, PageHero } from '../components/ui/index.js';
import { NFL_TEAMS } from '../data/nflTeams.js';
import { apiFetch } from '../lib/api.js';
import { setDataMode } from '../lib/dataMode.js';
import { platformChipStyle } from '../lib/platformChip.js';
import { useTheme } from '../lib/themeMode.js';

// Dedicated standings page — always expanded, full disconnected state.
// LeagueStandings.jsx (the collapsible widget) stays embedded in /football.

const PLATFORM_LABELS = { yahoo: 'Yahoo', sleeper: 'Sleeper', espn: 'ESPN' };

function PlatformPill({ platform }) {
  const label = PLATFORM_LABELS[platform] ?? platform;
  return (
    <span
      className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
      style={platformChipStyle(platform)}
    >
      {label}
    </span>
  );
}

function StandingsTable({ standings }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['#', 'Team', 'W–L', 'PF', 'PA'].map((h) => (
              <th
                key={h}
                className="pb-2.5 pr-4 text-left font-mono text-xs font-semibold uppercase tracking-wide last:pr-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr
              key={row.team_id}
              className="border-b last:border-0"
              style={{
                borderColor: row.is_current_user
                  ? 'var(--color-team-accent)'
                  : 'var(--color-border)',
                background: row.is_current_user
                  ? 'color-mix(in srgb, var(--color-team-accent) 12%, transparent)'
                  : 'transparent',
              }}
            >
              <td
                className="py-3 pr-4 font-mono text-xs tabular-nums"
                style={{
                  color: row.is_current_user
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-tertiary)',
                  width: 32,
                  borderLeft: row.is_current_user
                    ? '4px solid var(--color-team-accent)'
                    : '4px solid transparent',
                  paddingLeft: row.is_current_user ? 12 : 0,
                }}
              >
                {row.rank}
              </td>
              <td className="py-3 pr-4">
                <span
                  className="text-sm font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {row.team_name}
                  {row.is_current_user && (
                    <span
                      className="ml-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--color-team-accent)' }}
                    >
                      you
                    </span>
                  )}
                </span>
              </td>
              <td
                className="py-3 pr-4 font-mono text-xs tabular-nums"
                style={{
                  color: row.is_current_user
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {row.wins}–{row.losses}
              </td>
              <td
                className="py-3 pr-4 font-mono text-xs tabular-nums"
                style={{
                  color: row.is_current_user
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {row.points_for != null ? row.points_for.toFixed(1) : '—'}
              </td>
              <td
                className="py-3 font-mono text-xs tabular-nums"
                style={{
                  color: row.is_current_user
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {row.points_against != null ? row.points_against.toFixed(1) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((i) => (
        <div
          key={i}
          className="h-10 animate-pulse motion-reduce:animate-none rounded"
          style={{ background: 'var(--color-surface-2)' }}
        />
      ))}
    </div>
  );
}

export default function Standings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState(null);
  const { mode, team: teamAbbr } = useTheme();
  const wardRoom = useMemo(() => {
    if (mode !== 'team' || !teamAbbr) return null;
    return NFL_TEAMS.find((t) => t.abbr === teamAbbr)?.wardRoom ?? null;
  }, [mode, teamAbbr]);

  const load = useCallback(() => {
    setLoading(true);
    setErrorCode(null);
    apiFetch('/api/league/standings')
      .then(setData)
      .catch((err) => {
        const code = err?.body?.code ?? 'error';
        setErrorCode(code);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const isDisconnected = errorCode === 'league_not_connected';
  const isReconnect    = errorCode?.endsWith('_reconnect_required');

  // Phase 1.5g.3: populated standings are live league data → 'live' (moment
  // chrome suppressed); disconnected / reconnect / error / empty are mock-safe.
  // Unset (fail closed) while loading.
  useEffect(() => {
    if (loading) return undefined;
    const hasLiveStandings = !errorCode && Boolean(data?.standings?.length);
    setDataMode(hasLiveStandings ? 'live' : 'mock');
    return () => setDataMode(null);
  }, [loading, errorCode, data]);

  function renderContent() {
    if (loading) return <Skeleton />;

    // No league connected — show a proper CTA, not a blank screen
    if (isDisconnected) {
      return (
        <Card variant="empty">
          <Card.Header title="No league connected." />
          <Card.Body>Connect a Yahoo, Sleeper, or ESPN league to see where you stand.</Card.Body>
          <Card.Footer>
            <Button variant="primary" size="md" asChild>
              <Link to="/account/connect">Connect a league →</Link>
            </Button>
          </Card.Footer>
        </Card>
      );
    }

    // Platform auth expired — prompt reconnect
    if (isReconnect) {
      const platform = errorCode.replace('_reconnect_required', '');
      const label    = PLATFORM_LABELS[platform] ?? platform;
      return (
        <Card variant="solid">
          <Card.Body>Your {label} connection needs to be refreshed before standings can load.</Card.Body>
          <Card.Footer>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/account/connect">Reconnect {label} →</Link>
            </Button>
          </Card.Footer>
        </Card>
      );
    }

    // Generic / provider error
    if (errorCode) {
      return (
        <Card variant="error" tone="risk">
          <Card.Body>Couldn't load standings right now.</Card.Body>
          <Card.Footer>
            <Button variant="secondary" size="sm" onClick={load}>Try again</Button>
          </Card.Footer>
        </Card>
      );
    }

    // Empty standings (season not started)
    if (!data?.standings?.length) {
      return (
        <Card variant="empty">
          <Card.Header title="No standings yet." />
          <Card.Body>Standings will appear once the season begins.</Card.Body>
        </Card>
      );
    }

    // Standings table
    return (
      <Card variant="solid" className="overflow-hidden">
        {/* League meta row */}
        <div
          className="flex flex-wrap items-center gap-2 border-b px-5 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <PlatformPill platform={data.platform} />
          {data.league_name && (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {data.league_name}
            </span>
          )}
          {data.season && (
            <span
              className="ml-auto font-mono text-xs tabular-nums"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {data.season}
            </span>
          )}
        </div>

        <div className="px-5 pb-5 pt-4">
          <StandingsTable standings={data.standings} />
        </div>
      </Card>
    );
  }

  return (
    <AppLayout>
      <PageHero
        eyebrow="LEAGUE"
        title="Standings"
        subtitle="Where every manager sits after the last whistle."
        trailing={wardRoom ? <Chip>{wardRoom}</Chip> : null}
      />

      {renderContent()}
    </AppLayout>
  );
}
