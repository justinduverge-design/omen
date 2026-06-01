import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

const PLATFORM_LABELS = { yahoo: 'Yahoo', sleeper: 'Sleeper', espn: 'ESPN' };

function PlatformBadge({ platform }) {
  const label = PLATFORM_LABELS[platform] ?? platform;
  return (
    <span
      className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
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
            {['#', 'Team', 'W–L', 'PF'].map((h) => (
              <th
                key={h}
                className="pb-2 text-left font-mono text-xs font-semibold uppercase tracking-wide"
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
                borderColor: row.is_current_user ? 'var(--color-accent)' : 'var(--color-border)',
                background: row.is_current_user ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent',
              }}
            >
              <td
                className="py-2.5 pr-3 font-mono text-xs tabular-nums"
                style={{ color: 'var(--color-text-tertiary)', width: 28 }}
              >
                {row.rank}
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className="text-sm font-medium"
                  style={{ color: row.is_current_user ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                >
                  {row.team_name}
                  {row.is_current_user && (
                    <span className="ml-1.5 font-mono text-[10px] opacity-60">you</span>
                  )}
                </span>
              </td>
              <td
                className="py-2.5 pr-4 font-mono text-xs tabular-nums"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {row.wins}–{row.losses}
              </td>
              <td
                className="py-2.5 font-mono text-xs tabular-nums"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {row.points_for != null ? row.points_for.toFixed(1) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="h-9 animate-pulse rounded"
          style={{ background: 'var(--color-surface-2)' }}
        />
      ))}
    </div>
  );
}

export default function LeagueStandings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

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
  const isReconnect = errorCode && errorCode.endsWith('_reconnect_required');

  function renderBody() {
    if (loading) return <SkeletonTable />;

    if (isReconnect) {
      const platform = errorCode.replace('_reconnect_required', '');
      const label = PLATFORM_LABELS[platform] ?? platform;
      return (
        <div className="flex items-center justify-between py-2">
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {label} connection needs to be refreshed.
          </p>
          <Link
            className="shrink-0 text-xs font-semibold transition-colors"
            style={{ color: 'var(--color-accent)' }}
            to="/account/connect"
          >
            Reconnect →
          </Link>
        </div>
      );
    }

    if (errorCode) {
      return (
        <div className="flex items-center justify-between py-2">
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Couldn't load standings.
          </p>
          <button
            className="shrink-0 text-xs font-semibold transition-colors"
            style={{ color: 'var(--color-accent)' }}
            type="button"
            onClick={load}
          >
            Try again →
          </button>
        </div>
      );
    }

    if (!data?.standings?.length) return null;

    return <StandingsTable standings={data.standings} />;
  }

  if (!loading && isDisconnected && !data) {
    return null;
  }

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--color-surface-2)]"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
            League Standings
          </span>
          {data && (
            <>
              <PlatformBadge platform={data.platform} />
              {data.league_name && (
                <span className="hidden text-xs sm:inline" style={{ color: 'var(--color-text-tertiary)' }}>
                  · {data.league_name}
                </span>
              )}
            </>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-border)' }}>
          {renderBody()}
        </div>
      )}
    </div>
  );
}
