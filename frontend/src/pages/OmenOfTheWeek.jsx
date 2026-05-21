import { useCallback, useEffect, useState } from 'react';
import MockBanner from '../components/ui/MockBanner.jsx';
import { ApiError, apiFetch } from '../lib/api.js';

function useOmenData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch('/api/omen-of-the-week');
      setData(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load the Omen. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, retry: load };
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading omen">
      <div className="h-5 w-40 rounded-md bg-slate-800" />
      <div className="h-8 w-2/3 rounded-md bg-slate-800" />
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <div className="h-4 w-full rounded bg-slate-800" />
        <div className="h-4 w-5/6 rounded bg-slate-800" />
      </div>
      <div className="h-2 rounded-full bg-slate-800" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 rounded-xl bg-slate-800" />
        <div className="h-24 rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6">
      <p className="text-sm font-semibold text-red-300">Failed to load Omen of the Week</p>
      <p className="mt-1 text-sm text-red-200/70">{message}</p>
      <button
        className="mt-4 inline-flex items-center rounded-md bg-red-400/20 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-400/30"
        type="button"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
        Omen of the Week
      </p>
      <p className="mt-3 text-lg font-semibold text-white">No omen available this week</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        The oracle is silent. Connect a fantasy platform and check back when the season is active.
      </p>
    </div>
  );
}

function PlatformPromptState() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
        Omen of the Week
      </p>
      <p className="mt-3 text-lg font-semibold text-white">Connect a fantasy platform</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Link Yahoo, Sleeper, or ESPN to receive your personalized weekly omen.
      </p>
      <a
        className="mt-6 inline-flex items-center rounded-md bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
        href="/account"
      >
        Connect a platform →
      </a>
    </div>
  );
}

function LivePendingState() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
        Omen of the Week
      </p>
      <p className="mt-3 text-lg font-semibold text-white">Platform connected</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Your platform is connected. Live recommendations are being activated — check back soon.
      </p>
    </div>
  );
}


function RiskBadge({ risk }) {
  const styles = {
    low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    medium: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    high: 'border-red-400/30 bg-red-400/10 text-red-300',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[risk] ?? styles.medium}`}
    >
      {risk} risk
    </span>
  );
}

function MoveTypeBadge({ moveType }) {
  const labels = {
    lineup_swap: 'Lineup Swap',
    waiver_pickup: 'Waiver Pickup',
    trade: 'Trade',
  };
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
      {labels[moveType] ?? moveType}
    </span>
  );
}

function ConfidenceBar({ score, label }) {
  const barColor =
    score >= 70 ? 'bg-amber-400' : score >= 50 ? 'bg-amber-400/60' : 'bg-slate-600';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-slate-400">Confidence</p>
        <p className="text-xs font-semibold text-white">
          {score}% — {label}
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function PlayerCompareCard({ player, action, isRecommended }) {
  const statusColor =
    player.status === 'active'
      ? 'text-emerald-400'
      : player.status === 'questionable'
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div
      className={`rounded-xl border p-4 ${
        isRecommended
          ? 'border-amber-400/40 bg-amber-400/5'
          : 'border-slate-700 bg-slate-950'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {action}
          </p>
          <p className="mt-1 truncate text-base font-semibold text-white">{player.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {player.position} · {player.team} vs {player.opponent}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xl font-semibold text-white">{player.projected_points}</p>
          <p className="text-xs text-slate-500">proj pts</p>
        </div>
      </div>
      {player.status !== 'active' && (
        <p className={`mt-2 text-xs font-semibold capitalize ${statusColor}`}>
          {player.status}
        </p>
      )}
    </div>
  );
}

function PrimaryActionCard({ action }) {
  if (!action || action.type !== 'start_sit') return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-slate-400">Primary Move</p>
        <span className="rounded border border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-400">
          {action.roster_slot}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlayerCompareCard player={action.start} action="START" isRecommended />
        <PlayerCompareCard player={action.sit} action="SIT" isRecommended={false} />
      </div>
      <p className="text-xs text-amber-300">
        +{action.projected_points_delta} projected point advantage
      </p>
    </div>
  );
}

function ImpactGrid({ impact }) {
  function fmt(val, suffix) {
    if (val == null) return '—';
    return `${val >= 0 ? '+' : ''}${val}${suffix}`;
  }

  const metrics = [
    {
      label: 'Point Swing',
      value: fmt(impact.projected_points_delta, ' pts'),
      positive: (impact.projected_points_delta ?? 0) >= 0,
    },
    {
      label: 'Win Prob Delta',
      value: fmt(impact.win_probability_delta, '%'),
      positive: (impact.win_probability_delta ?? 0) >= 0,
    },
    {
      label: 'Floor Delta',
      value: fmt(impact.floor_delta, ' pts'),
      positive: (impact.floor_delta ?? 0) >= 0,
    },
    {
      label: 'Ceiling Delta',
      value: fmt(impact.ceiling_delta, ' pts'),
      positive: (impact.ceiling_delta ?? 0) >= 0,
    },
  ];

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Impact</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">{m.label}</p>
            <p
              className={`mt-1 text-base font-semibold ${
                m.positive ? 'text-white' : 'text-red-300'
              }`}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReasoningList({ reasoning }) {
  if (!reasoning?.length) return null;
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">Reasoning</p>
      <ol className="space-y-3">
        {reasoning.map((line, i) => (
          <li key={i} className="flex gap-3 text-sm leading-6 text-slate-300">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-xs font-semibold text-amber-400">
              {i + 1}
            </span>
            {line}
          </li>
        ))}
      </ol>
    </div>
  );
}

function EvidenceList({ evidence }) {
  if (!evidence?.length) return null;
  const weightStyles = {
    high: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    medium: 'border-slate-600 bg-slate-800 text-slate-300',
    low: 'border-slate-700 bg-slate-900/50 text-slate-400',
  };
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Evidence</p>
      <div className="flex flex-wrap gap-2">
        {evidence.map((item, i) => (
          <div
            key={i}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
              weightStyles[item.weight] ?? weightStyles.medium
            }`}
          >
            <span className="font-semibold">{item.label}</span>
            <span className="opacity-50">·</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlternativeCard({ alt }) {
  const riskColor = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };
  const moveLabel = {
    lineup_swap: 'Lineup Swap',
    waiver_pickup: 'Waiver Pickup',
    trade: 'Trade',
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{moveLabel[alt.move_type] ?? alt.move_type}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{alt.headline}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-white">{alt.confidence_score}%</p>
        <p className={`text-xs capitalize ${riskColor[alt.risk_level] ?? riskColor.medium}`}>
          {alt.risk_level} risk
        </p>
      </div>
    </div>
  );
}

function platformLabel(platform) {
  const labels = {
    yahoo: 'Yahoo',
    sleeper: 'Sleeper',
    espn: 'ESPN',
  };
  const normalized = String(platform || '').trim().toLowerCase();
  return labels[normalized] || (normalized ? normalized[0].toUpperCase() + normalized.slice(1) : '');
}

export default function OmenOfTheWeek() {
  const { data, loading, error, retry } = useOmenData();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data?.recommendation) {
    if (data?.status === 'needs_platform_connection') return <PlatformPromptState />;
    if (data?.status === 'connected_platform_pending_live_engine') return <LivePendingState />;
    return <EmptyState />;
  }

  const { recommendation: rec, week, season, is_mock, scoring_format, source } = data;
  const livePlatformLabel = !is_mock && source?.platform ? platformLabel(source.platform) : '';

  return (
    <div className="space-y-6">
      {is_mock && <MockBanner message="Preview Mode — mock data. Live recommendations connect to your actual roster when the season begins." />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Omen of the Week
            </p>
            {livePlatformLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live · {livePlatformLabel}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            {rec.headline}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Week {week} · {season} Season
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MoveTypeBadge moveType={rec.move_type} />
          <RiskBadge risk={rec.risk_level} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
        <p className="text-sm leading-6 text-slate-300">{rec.summary}</p>
        <p className="mt-2 text-xs text-gray-400">
          Powered by Corvus · Week {week ?? '—'}{scoring_format ? ` · ${scoring_format}` : ''}
        </p>
      </div>

      <ConfidenceBar score={rec.confidence_score} label={rec.confidence_label} />

      <PrimaryActionCard action={rec.primary_action} />

      <ImpactGrid impact={rec.impact} />

      <ReasoningList reasoning={rec.reasoning} />

      <EvidenceList evidence={rec.evidence} />

      {rec.alternatives?.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Also Consider</p>
          <div className="space-y-2">
            {rec.alternatives.map((alt) => (
              <AlternativeCard key={alt.id} alt={alt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
