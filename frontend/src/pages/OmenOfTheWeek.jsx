import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import OmenFeedback from '../components/omen/OmenFeedback.jsx';
import MockBanner from '../components/ui/MockBanner.jsx';
import { ApiError, apiFetch } from '../lib/api.js';
import { PRIVATE_FIXTURE_KEYS, getPrivateFixtureKey } from '../lib/privateFixtureMode.js';
import { confidenceBarStyle } from '../lib/confidenceGradient.js';
import {
  formatOmenSignalKey,
  omenSignalBadgeStyle,
  omenSignalStatusMeta,
} from '../lib/omenSignalLabels.js';

const ESPN_RECOVERY_STATES = new Set([
  'espn_reauth_required',
  'espn_league_context_missing',
  'espn_import_blocked',
  'espn_recovery_needed',
]);

const RISK_STYLES = {
  low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  medium: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  high: 'border-red-400/30 bg-red-400/10 text-red-300',
};

function useOmenData() {
  const fixtureKey = getPrivateFixtureKey();
  const fixtureActive = fixtureKey === PRIVATE_FIXTURE_KEYS.OMEN_ROSTER;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (fixtureActive && import.meta.env.DEV) {
      const { OMEN_VISUAL_FIXTURE } = await import('../data/privateDemoFixtures.js');
      setData(OMEN_VISUAL_FIXTURE);
      setLoading(false);
      return;
    }
    try {
      const result = await apiFetch('/api/omen/mvp-move', {
        method: 'POST',
        body: {},
      });
      setData(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try { localStorage.setItem('omen.auth.next', '/omen'); } catch (_) {}
        navigate('/login');
        return;
      }
      if (err instanceof ApiError && err.body?.state) {
        setData(err.body);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load the Omen. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, fixtureActive]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, retry: load };
}

function LoadingState({ cry }) {
  return (
    <div aria-busy="true" aria-label="Loading omen">
      {/* Real header — branded, not a skeleton block */}
      <div className="mb-5 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">
          Omen of the Week
        </p>
        {cry && (
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-team-accent)', opacity: 0.5 }}
          >
            {cry}
          </p>
        )}
      </div>

      {/* Content skeleton */}
      <div className="animate-pulse motion-reduce:animate-none space-y-4">
        <div className="h-8 w-2/3 rounded-md bg-slate-800" />
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
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
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6">
      <p className="text-sm font-semibold text-red-300">Failed to load Omen of the Week</p>
      <p className="mt-1 text-sm text-red-200/70">{message}</p>
      <button
        className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-red-400/20 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-400/30"
        type="button"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ explanation }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
        Omen of the Week
      </p>
      <p className="mt-3 text-lg font-semibold text-white">No move clears the threshold</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {explanation?.summary ?? 'Omen does not see a weekly move worth forcing right now.'}
      </p>
      {explanation?.why_it_matters ? (
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {explanation.why_it_matters}
        </p>
      ) : null}
      {explanation?.confidence ? (
        <p className="mt-3 text-xs text-slate-500">{explanation.confidence}</p>
      ) : null}
    </div>
  );
}

function PlatformPromptState({ platform }) {
  const recovery = platform?.recovery;
  const platformName = platformLabel(platform?.name) || 'your fantasy platform';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
        Omen of the Week
      </p>
      <p className="mt-3 text-lg font-semibold text-white">Connect {platformName}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {recovery?.message ?? 'Link Yahoo, Sleeper, or ESPN to receive your personalized weekly omen.'}
      </p>
      <a
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
        href="/account"
      >
        {recovery?.cta ?? 'Connect a platform'} →
      </a>
    </div>
  );
}

function RecoveryPanel({ platform, state }) {
  if (!platform) return null;

  const { name, recovery } = platform;
  const isEspn = name === 'espn';
  const accountHref = isEspn && state
    ? `/account?platform=espn&recovery=${state}`
    : '/account';

  return (
    <section className="rounded-xl border border-red-400/20 bg-red-400/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
        {isEspn ? 'ESPN recovery required' : 'Platform disconnected'}
      </p>
      <h2 className="mt-2 text-xl font-semibold capitalize text-white">
        {platformLabel(name) || name}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {recovery?.message ?? 'Reconnect your platform before Omen can read your roster.'}
      </p>
      {recovery?.fields_needed?.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Fields needed: {recovery.fields_needed.join(', ')}
        </p>
      ) : null}
      {recovery?.cta ? (
        <a
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400"
          href={accountHref}
        >
          {recovery.cta} →
        </a>
      ) : null}
    </section>
  );
}

function RiskBadge({ risk }) {
  if (!risk) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${RISK_STYLES[risk] ?? RISK_STYLES.medium}`}
    >
      {risk} risk
    </span>
  );
}

function MoveTypeBadge({ moveType }) {
  if (!moveType) return null;

  const labels = {
    start_sit: 'Start/Sit',
    lineup_swap: 'Lineup Swap',
    waiver_pickup: 'Waiver Pickup',
    trade: 'Trade',
    trade_suggestion: 'Trade',
  };

  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
      {labels[moveType] ?? moveType.replace(/_/g, ' ')}
    </span>
  );
}

function ConfidenceBar({ confidence }) {
  if (!confidence) return null;

  const score = Math.min(100, Math.max(0, Number(confidence.score) || 0));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-widest text-slate-400">Confidence</p>
        <p className="text-right text-xs font-semibold text-white">
          <span className="font-mono tabular-nums">{score}%</span>
          {confidence.label ? (
            <span className="font-sans"> - {confidence.label.replace('_', ' ')}</span>
          ) : null}
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
          style={confidenceBarStyle(score)}
        />
      </div>
      {confidence.rationale ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{confidence.rationale}</p>
      ) : null}
    </div>
  );
}

function PlayerCompareCard({ player, action, isRecommended }) {
  if (!player) return null;

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
            {[player.position, player.team].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  );
}

function PrimaryActionCard({ recommendation }) {
  const primary = recommendation?.primary_player;
  const comparison = recommendation?.comparison_player;
  if (!primary && !comparison) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-slate-400">Primary Move</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlayerCompareCard player={primary} action="START" isRecommended />
        <PlayerCompareCard player={comparison} action="BENCH" isRecommended={false} />
      </div>
      {recommendation?.move ? (
        <p className="text-xs leading-5 text-amber-300">{recommendation.move}</p>
      ) : null}
    </div>
  );
}

function ImpactGrid({ expectedValueDelta }) {
  if (!expectedValueDelta) return null;

  const points = Number(expectedValueDelta.points);
  const formattedPoints = Number.isFinite(points)
    ? `${points >= 0 ? '+' : ''}${points.toFixed(1)} pts`
    : '—';

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Impact</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Expected Value Delta</p>
          <p className="mt-1 text-base font-semibold text-white">{formattedPoints}</p>
        </div>
        {expectedValueDelta.label ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">Edge Label</p>
            <p className="mt-1 text-base font-semibold capitalize text-white">
              {expectedValueDelta.label}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReasoningList({ explanation }) {
  const reasoning = reasoningFromExplanation(explanation);
  if (!reasoning.length) return null;

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">Reasoning</p>
      <ol className="space-y-3">
        {reasoning.map((line, i) => (
          <li key={line} className="flex gap-3 text-sm leading-6 text-slate-300">
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

function SignalBadge({ status }) {
  const meta = omenSignalStatusMeta(status);
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={omenSignalBadgeStyle(status)}
    >
      {meta.label}
    </span>
  );
}

function SignalsPanel({ signals }) {
  const entries = Object.entries(signals || {});
  if (!entries.length) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            Input honesty
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-tertiary)]">
            Live inputs drive the call. Stub, mock, and unavailable inputs are labeled before the reasoning.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {entries.map(([key, signal]) => {
          const meta = omenSignalStatusMeta(signal?.status);
          const usedLabel = signal?.used ? meta.usedLabel : 'Not used';
          return (
          <div
            key={key}
            className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {formatOmenSignalKey(key)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {meta.description}
              </p>
              {signal?.message ? (
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-tertiary)]">{signal.message}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SignalBadge status={signal?.status} />
              <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">
                {usedLabel}
              </span>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskReasons({ risk }) {
  if (!risk?.reasons?.length) return null;

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Risk Notes</p>
      <ul className="space-y-2">
        {risk.reasons.map((reason) => (
          <li key={reason} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs leading-5 text-slate-400">
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlternativeCard({ alt }) {
  const riskLevel = alt.risk?.level ?? alt.risk_level;
  const confidenceScore = alt.confidence?.score ?? alt.confidence_score;
  const title = alt.title ?? alt.headline ?? alt.move ?? 'Alternative move';
  const moveType = alt.type ?? alt.move_type;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs capitalize text-slate-500">{moveType?.replace(/_/g, ' ')}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        {confidenceScore != null ? (
          <p className="text-sm font-semibold text-white">{confidenceScore}%</p>
        ) : null}
        {riskLevel ? (
          <p className="text-xs capitalize text-amber-400">{riskLevel} risk</p>
        ) : null}
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

function isMockMode(data) {
  if (data?.mode === 'mock') return true;
  if (data?.warnings?.some((warning) => String(warning).toLowerCase().includes('mock'))) {
    return true;
  }

  const statuses = Object.values(data?.signals || {})
    .map((signal) => signal?.status)
    .filter(Boolean);

  return statuses.length > 0 && statuses.every((status) => status === 'mock' || status === 'stub');
}

function isDemoMode(data) {
  return data?.mode === 'demo' || data?.is_demo === true;
}

function reasoningFromExplanation(explanation) {
  if (!explanation) return [];

  const lines = [
    explanation.why_it_matters,
    explanation.risk,
    explanation.confidence,
  ].filter(Boolean);

  if (Array.isArray(explanation.data_used) && explanation.data_used.length) {
    lines.push(`Data used: ${explanation.data_used.join(', ')}.`);
  }

  return lines;
}

// Team-theme voice removed 2026-07-12; Omen of the Week no longer renders a
// team cry line.
function getTeamCry() {
  return null;
}

export default function OmenOfTheWeek() {
  const { data, loading, error, retry } = useOmenData();
  const cry = useMemo(() => getTeamCry(), []);

  if (loading) return <LoadingState cry={cry} />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  if (data?.state === 'pending_live_engine') {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Omen of the Week
        </p>
        <p className="mt-3 text-lg font-semibold text-white">Platform connected</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Your platform is connected. Live recommendations are being prepared — check back soon.
        </p>
        <Link
          className="mt-6 inline-flex items-center text-xs text-slate-500 transition-colors hover:text-slate-300"
          to="/football"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (ESPN_RECOVERY_STATES.has(data?.state)) {
    return <RecoveryPanel platform={data.platform} state={data.state} />;
  }

  if (data?.state === 'platform_disconnected') {
    return <PlatformPromptState platform={data.platform} />;
  }

  if (data?.state === 'empty') {
    return <EmptyState explanation={data.explanation} />;
  }

  if (data?.state === 'error') {
    return (
      <ErrorState
        message={data.error?.message ?? 'Omen could not generate an MVP Move right now.'}
        onRetry={retry}
      />
    );
  }

  if (data?.state !== 'success' || !data?.recommendation) {
    return <EmptyState explanation={data?.explanation} />;
  }

  return <OmenRecommendationView data={data} />;
}

/**
 * OmenRecommendationView — presentational render for a success-state Omen
 * envelope. Shared between `/omen` (live + private fixture) and `/demo`
 * (Phase 2.7 public demo fixture).
 *
 * Props:
 *  - data: omen envelope (recommendation, league, platform, signals, alternatives)
 *  - banner: optional ReactNode rendered above the header (e.g., Demo Mode label)
 *  - showFeedback: gate the HITL feedback ritual. Defaults to live-only behavior.
 */
export function OmenRecommendationView({ data, banner = null, showFeedback }) {
  const { recommendation: rec, league, platform, signals, alternatives = [] } = data;
  const mockMode = isMockMode(data);
  const demoMode = isDemoMode(data);
  const privateFixtureMode = data?.fixture_key === PRIVATE_FIXTURE_KEYS.OMEN_ROSTER;
  const livePlatformLabel = !mockMode && !demoMode && platform?.name
    ? platformLabel(platform.name)
    : '';
  // Default: show feedback on live, suppress on mock/demo. Explicit prop wins.
  const feedbackVisible = showFeedback != null ? showFeedback : (!mockMode && !demoMode);

  return (
    <div className="space-y-6">
      {banner}

      {mockMode && !banner && (
        <MockBanner message={privateFixtureMode
          ? `${data.fixture_label} Omen roster and recommendation are mock.`
          : 'Preview Mode - mock or stub data is labeled in the signal list. Live recommendations connect to your actual roster when the season begins.'}
        />
      )}

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
            {demoMode && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-xs font-semibold"
                style={{ color: 'var(--color-demo-text)' }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Demo
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            {rec.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Week {league?.week ?? '—'} · {league?.season ?? '—'} Season
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MoveTypeBadge moveType={rec.type} />
          <RiskBadge risk={rec.risk?.level} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
        <p className="text-sm leading-6 text-slate-300">
          {rec.explanation?.summary ?? rec.move}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Powered by Omen · Week {league?.week ?? '—'}
          {league?.scoring_format ? ` · ${league.scoring_format.toUpperCase()}` : ''}
        </p>
      </div>

      <ConfidenceBar confidence={rec.confidence} />

      <PrimaryActionCard recommendation={rec} />

      <ImpactGrid expectedValueDelta={rec.expected_value_delta} />

      <ReasoningList explanation={rec.explanation} />

      <RiskReasons risk={rec.risk} />

      <SignalsPanel signals={signals} />

      {alternatives.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Also Consider</p>
          <div className="space-y-2">
            {alternatives.map((alt) => (
              <AlternativeCard key={alt.id ?? alt.title ?? alt.headline} alt={alt} />
            ))}
          </div>
        </div>
      )}

      {feedbackVisible && (
        <OmenFeedback
          week={league?.week}
          season={league?.season}
          moveTitle={rec.title}
          moveSubtext={rec.explanation?.summary}
        />
      )}
    </div>
  );
}
