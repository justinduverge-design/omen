import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NFL_TEAMS } from '../../data/nflTeams.js';
import { apiFetch } from '../../lib/api.js';
import { useTheme } from '../../lib/themeMode.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function effectivenessColor(pct) {
  if (pct == null) return 'var(--color-text-tertiary)';
  if (pct >= 70) return 'var(--color-risk-low)';
  if (pct >= 40) return 'var(--color-accent)';
  return 'var(--color-risk-high)';
}

// ── Sub-components ─────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }) {
  if (!outcome || outcome === 'pending') {
    return (
      <span
        className="rounded-full border px-2 py-0.5 text-xs font-semibold"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
      >
        Pending
      </span>
    );
  }
  const isWin = outcome === 'win';
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={
        isWin
          ? { borderColor: 'color-mix(in srgb, var(--color-risk-low) 30%, transparent)', background: 'color-mix(in srgb, var(--color-risk-low) 8%, transparent)', color: 'var(--color-risk-low)' }
          : { borderColor: 'color-mix(in srgb, var(--color-risk-high) 30%, transparent)', background: 'color-mix(in srgb, var(--color-risk-high) 8%, transparent)', color: 'var(--color-risk-high)' }
      }
    >
      {isWin ? 'Win' : 'Loss'}
    </span>
  );
}

function MoveTypeBadge({ type }) {
  if (!type) return null;
  const labels = {
    start_sit:        'Start/Sit',
    waiver_pickup:    'Waiver',
    trade_suggestion: 'Trade',
    matchup_note:     'Matchup',
  };
  return (
    <span
      className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
    >
      {labels[type] ?? type}
    </span>
  );
}

function FollowedLabel({ followed }) {
  if (followed === true) {
    return (
      <span
        className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ borderColor: 'color-mix(in srgb, var(--color-risk-low) 25%, transparent)', color: 'var(--color-risk-low)' }}
      >
        Ran it
      </span>
    );
  }
  if (followed === false) {
    return (
      <span
        className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
      >
        Skipped
      </span>
    );
  }
  return null;
}

function SummaryStats({ summary, season }) {
  const { wins, losses, pending, avg_effectiveness_pct, total_count } = summary;
  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Season {season ?? '—'}
        </span>
        <span
          className="font-mono text-[11px] tabular-nums"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {total_count} move{total_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="text-center">
          <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {wins}–{losses}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Record</p>
        </div>
        <div className="text-center">
          <p
            className="font-mono text-2xl font-bold tabular-nums"
            style={{ color: avg_effectiveness_pct != null ? effectivenessColor(avg_effectiveness_pct) : 'var(--color-text-tertiary)' }}
          >
            {avg_effectiveness_pct != null ? `${avg_effectiveness_pct}%` : '—'}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Avg effectiveness</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
            {pending}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Pending</p>
        </div>
      </div>
    </div>
  );
}

function MoveRow({ move }) {
  const rec = move.recommendation
    ? move.recommendation.length > 80
      ? move.recommendation.slice(0, 77) + '…'
      : move.recommendation
    : null;

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:gap-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      {/* Week + type */}
      <div className="flex shrink-0 flex-row items-center gap-2 sm:w-20 sm:flex-col sm:items-start sm:gap-1.5">
        <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--color-text-tertiary)' }}>
          Wk {move.week}
        </span>
        <MoveTypeBadge type={move.move_type} />
      </div>

      {/* Recommendation */}
      <p className="flex-1 text-sm leading-5" style={{ color: rec ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
        {rec ?? 'No summary recorded.'}
      </p>

      {/* Right side: followed + outcome + effectiveness */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <FollowedLabel followed={move.followed} />
        <OutcomeBadge outcome={move.outcome} />
        {move.effectiveness_pct != null && (
          <span
            className="font-mono text-xs tabular-nums"
            style={{ color: effectivenessColor(move.effectiveness_pct) }}
          >
            {move.effectiveness_pct}%
          </span>
        )}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg"
          style={{ background: 'var(--color-surface-2)' }}
        />
      ))}
    </div>
  );
}

function EmptyHistory() {
  const { mode, team: teamAbbr } = useTheme();
  const wardRoom = useMemo(() => {
    if (mode !== 'team' || !teamAbbr) return null;
    return NFL_TEAMS.find((t) => t.abbr === teamAbbr)?.wardRoom ?? null;
  }, [mode, teamAbbr]);

  return (
    <div
      className="rounded-xl border px-6 py-12 text-center"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      {/* Raven glyph */}
      <p
        className="mb-4 text-4xl leading-none"
        aria-hidden="true"
        style={{ color: 'var(--color-border)' }}
      >
        ◈
      </p>
      <p className="font-display text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        No moves yet.
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '36ch', margin: '8px auto 0' }}>
        Run your first Omen, follow the move, and Omen will start tracking
        your season record here.
      </p>
      {wardRoom && (
        <p
          className="mt-3 font-serif text-base italic"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {wardRoom}
        </p>
      )}
      <Link
        to="/omen"
        className="mt-6 inline-block rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
      >
        Go to Omen →
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MoveHistory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    apiFetch('/api/moves')
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl" style={{ background: 'var(--color-surface-2)' }} />
        <SkeletonRows />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Couldn't load history.
        </p>
        <button
          className="mt-3 text-xs font-semibold transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
          style={{ color: 'var(--color-accent)' }}
          type="button"
          onClick={load}
        >
          Try again →
        </button>
      </div>
    );
  }

  if (!data?.moves?.length) {
    return <EmptyHistory />;
  }

  return (
    <div className="space-y-3">
      <SummaryStats summary={data.summary} season={data.season} />
      <div className="space-y-2">
        {data.moves.map((move) => (
          <MoveRow key={move.id} move={move} />
        ))}
      </div>
    </div>
  );
}
