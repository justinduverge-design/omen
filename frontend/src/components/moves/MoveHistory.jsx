import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

function effectivenessColor(pct) {
  if (pct == null) return 'var(--color-text-tertiary)';
  if (pct >= 70) return '#4ade80';
  if (pct >= 40) return 'var(--color-accent)';
  return '#f87171';
}

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
          ? { borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ade80' }
          : { borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: '#f87171' }
      }
    >
      {isWin ? 'Win' : 'Loss'}
    </span>
  );
}

function MoveTypeBadge({ type }) {
  const labels = {
    start_sit: 'Start/Sit',
    waiver_pickup: 'Waiver',
    trade_suggestion: 'Trade',
    matchup_note: 'Matchup',
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

function SummaryStats({ summary }) {
  const { wins, losses, pending, avg_effectiveness_pct } = summary;
  return (
    <div
      className="grid grid-cols-3 gap-3 rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
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
  );
}

function MoveRow({ move }) {
  const rec = move.recommendation
    ? move.recommendation.length > 60
      ? move.recommendation.slice(0, 57) + '…'
      : move.recommendation
    : '—';

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:gap-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      <div className="flex shrink-0 flex-col items-start gap-1 sm:w-16 sm:items-center">
        <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--color-text-tertiary)' }}>
          Wk {move.week}
        </span>
        <MoveTypeBadge type={move.move_type} />
      </div>

      <p className="flex-1 text-sm leading-5" style={{ color: 'var(--color-text-primary)' }}>
        {rec}
      </p>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }} title={move.followed ? 'Followed' : move.followed === false ? 'Not followed' : 'No response'}>
          {move.followed === true ? '✓' : move.followed === false ? '–' : '·'}
        </span>
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
          className="h-16 animate-pulse motion-reduce:animate-none rounded-lg"
          style={{ background: 'var(--color-surface-2)' }}
        />
      ))}
    </div>
  );
}

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
        <div className="h-20 animate-pulse motion-reduce:animate-none rounded-xl" style={{ background: 'var(--color-surface-2)' }} />
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
          className="mt-3 text-xs font-semibold transition-colors"
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
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <p className="font-serif text-lg" style={{ color: 'var(--color-text-primary)' }}>
          No moves yet.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Follow your first Omen to start building your record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryStats summary={data.summary} />
      <div className="space-y-2">
        {data.moves.map((move) => (
          <MoveRow key={move.id} move={move} />
        ))}
      </div>
    </div>
  );
}
