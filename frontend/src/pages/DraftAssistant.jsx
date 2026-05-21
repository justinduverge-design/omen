import { useEffect, useState } from 'react';
import ErrorState from '../components/ui/ErrorState.jsx';
import MockBanner from '../components/ui/MockBanner.jsx';
import { apiFetch } from '../lib/api.js';

const SCORING_FORMATS = [
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'standard', label: 'Standard' },
];

const POSITION_NEEDS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'];

const REC_TYPE_LABELS = {
  best_available: 'Best Available',
  roster_fit: 'Roster Fit',
  value_pick: 'Value Pick',
  risk_adjusted: 'Risk Adjusted',
};

// Build { [playerName]: { ffc, yahoo, mfl } } lookup from ADP response sources
function buildAdpMap(sources) {
  if (!sources) return {};
  const map = {};
  for (const [sourceKey, sourceData] of Object.entries(sources)) {
    for (const player of sourceData?.players ?? []) {
      if (!player.name) continue;
      if (!map[player.name]) map[player.name] = {};
      map[player.name][sourceKey] = player.adp;
    }
  }
  return map;
}

// Return the first connected platform key from the platforms summary object
function getConnectedPlatform(platforms) {
  if (!platforms) return null;
  for (const key of ['yahoo', 'sleeper', 'espn']) {
    if (platforms[key]?.connected) return key;
  }
  return null;
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

function PositionBadge({ position }) {
  const colors = {
    QB: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    RB: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    WR: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    TE: 'border-purple-400/30 bg-purple-400/10 text-purple-300',
    K: 'border-slate-600 bg-slate-800 text-slate-300',
    DEF: 'border-slate-600 bg-slate-800 text-slate-300',
    FLEX: 'border-slate-600 bg-slate-800 text-slate-300',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${colors[position] ?? colors.K}`}
    >
      {position}
    </span>
  );
}

function ConfidenceBar({ score }) {
  const barColor =
    score >= 70 ? 'bg-amber-400' : score >= 50 ? 'bg-amber-400/60' : 'bg-slate-600';
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-white">{score}%</span>
    </div>
  );
}

const ADP_OTHER_SOURCES = [
  { key: 'ffc', label: 'FFC', href: 'https://fantasyfootballcalculator.com' },
  { key: 'yahoo', label: 'Yahoo', href: null },
  { key: 'mfl', label: 'MFL', href: null },
];

function AdpRow({ rec, adpMap, adpLoading, connectedPlatform }) {
  if (adpLoading) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        <p className="text-xs uppercase tracking-widest text-slate-500">ADP</p>
        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  if (!adpMap) return null;

  const playerAdp = adpMap[rec.player.name] ?? {};

  // Primary chip: connected platform ADP. Only Yahoo is in the ADP sources.
  const platformAdp = connectedPlatform === 'yahoo' ? (playerAdp.yahoo ?? null) : null;

  // Other sources: FFC, MFL, and Yahoo only if Yahoo isn't the connected platform
  const otherSources = ADP_OTHER_SOURCES
    .filter((s) => !(s.key === 'yahoo' && connectedPlatform === 'yahoo'))
    .filter((s) => playerAdp[s.key] != null);

  const hasAnything = platformAdp != null || otherSources.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-slate-800/60 pt-3">
      <p className="text-xs uppercase tracking-widest text-slate-500">ADP</p>

      {platformAdp != null && (
        <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-0.5 text-sm font-semibold text-amber-300">
          Yahoo {platformAdp}
        </span>
      )}

      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
        Corvus #{rec.rank}
      </span>

      {otherSources.length > 0 && (
        <span className="flex items-center gap-1 text-xs text-slate-500">
          {otherSources.map((src, i) => (
            <span key={src.key} className="flex items-center gap-1">
              {i > 0 && <span>·</span>}
              {src.href ? (
                <a
                  className="text-xs text-gray-400 underline hover:text-gray-300"
                  href={src.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {src.label}
                </a>
              ) : (
                <span>{src.label}</span>
              )}
              <span>{playerAdp[src.key]}</span>
            </span>
          ))}
        </span>
      )}

      {!hasAnything && <span className="text-xs text-slate-600">—</span>}
    </div>
  );
}

function RecommendationCard({ rec, adpMap, adpLoading, connectedPlatform }) {
  const isTop = rec.rank === 1;
  return (
    <div
      className={`space-y-4 rounded-xl border p-5 ${
        isTop
          ? 'border-amber-400/40 bg-amber-400/5 shadow-lg shadow-amber-400/5'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              isTop
                ? 'bg-amber-400 text-amber-950'
                : 'border border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {rec.rank}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-white">{rec.player.name}</p>
              <PositionBadge position={rec.player.position} />
              <p className="text-xs text-slate-500">{rec.player.team}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
            {REC_TYPE_LABELS[rec.recommendation_type] ?? rec.recommendation_type}
          </span>
          <RiskBadge risk={rec.risk_level} />
        </div>
      </div>

      <p className={`text-base font-semibold ${isTop ? 'text-amber-100' : 'text-white'}`}>
        {rec.headline}
      </p>

      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Confidence</p>
        <ConfidenceBar score={rec.confidence_score} />
      </div>

      {rec.reasoning?.length > 0 && (
        <ol className="space-y-2">
          {rec.reasoning.map((line, i) => (
            <li key={i} className="flex gap-3 text-sm leading-6 text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-xs font-semibold text-amber-400">
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
      )}

      <AdpRow
        rec={rec}
        adpMap={adpMap}
        adpLoading={adpLoading}
        connectedPlatform={connectedPlatform}
      />
    </div>
  );
}

function LoadingRecommendations() {
  return (
    <div aria-busy="true" aria-label="Loading recommendations" className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-slate-800" />
            <div className="h-5 w-36 rounded bg-slate-800" />
          </div>
          <div className="h-5 w-3/4 rounded bg-slate-800" />
          <div className="h-2 rounded-full bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-5/6 rounded bg-slate-800" />
            <div className="h-4 w-4/6 rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DraftAssistant({ platforms }) {
  const [scoringFormat, setScoringFormat] = useState('ppr');
  const [draftPosition, setDraftPosition] = useState('5');
  const [round, setRound] = useState('1');
  const [needs, setNeeds] = useState(new Set(['RB', 'WR']));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [adpData, setAdpData] = useState(null);
  const [adpLoading, setAdpLoading] = useState(false);

  const connectedPlatform = getConnectedPlatform(platforms);
  const adpMap = adpData ? buildAdpMap(adpData.sources) : null;

  useEffect(() => {
    let mounted = true;
    setAdpLoading(true);
    apiFetch(`/api/draft-assistant/adp?format=${scoringFormat}&teams=12`)
      .then((data) => { if (mounted) setAdpData(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setAdpLoading(false); });
    return () => { mounted = false; };
  }, [scoringFormat]);

  function toggleNeed(pos) {
    setNeeds((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    setHasSubmitted(true);

    try {
      const data = await apiFetch('/api/draft-assistant/recommendations', {
        method: 'POST',
        body: {
          scoring_format: scoringFormat,
          draft_position: Number(draftPosition) || 5,
          round: Number(round) || 1,
          position_needs: [...needs],
        },
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to get draft recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const scoringLabel = SCORING_FORMATS.find((f) => f.value === scoringFormat)?.label ?? '';

  return (
    <div className="space-y-6">
      <MockBanner message={`Preview Mode — example recommendations. Live personalization activates when the season begins.${adpData?.is_mock ? ' ADP data is preview only.' : ''}`} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Draft Assistant
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Your next pick</h2>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
            Free · 2025 Season
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Tell Corvus where you are in your draft. It will surface the best available move for your roster.
        </p>
      </div>

      <form
        className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5"
        onSubmit={handleSubmit}
      >
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Scoring Format
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCORING_FORMATS.map(({ value, label }) => (
              <button
                key={value}
                className={[
                  'min-h-[44px] rounded-md border px-4 py-2 text-sm font-semibold transition-colors',
                  scoringFormat === value
                    ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white',
                ].join(' ')}
                type="button"
                onClick={() => setScoringFormat(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Draft Position (1–12)
            <input
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
              max="12"
              min="1"
              type="number"
              value={draftPosition}
              onChange={(e) => setDraftPosition(e.target.value)}
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Current Round (1–15)
            <input
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
              max="15"
              min="1"
              type="number"
              value={round}
              onChange={(e) => setRound(e.target.value)}
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Position Needs
          </legend>
          <p className="mt-1 text-xs text-slate-500">
            Select the positions you still need to fill.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POSITION_NEEDS.map((pos) => {
              const isSelected = needs.has(pos);
              return (
                <button
                  key={pos}
                  className={[
                    'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                    isSelected
                      ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                      : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white',
                  ].join(' ')}
                  type="button"
                  onClick={() => toggleNeed(pos)}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950/30 border-t-amber-950"
            />
          )}
          {loading ? 'Analyzing...' : hasSubmitted ? 'Run Again' : 'Get Recommendation'}
        </button>
      </form>

      {loading && <LoadingRecommendations />}

      {!loading && error && (
        <ErrorState
          title="Failed to get recommendations"
          message={error}
          onRetry={handleSubmit}
        />
      )}

      {!loading && result?.recommendations?.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Recommendations — Round {result.round} · Position {result.draft_position} · {scoringLabel}
          </p>
          {result.recommendations.map((rec) => (
            <RecommendationCard
              key={rec.rank}
              rec={rec}
              adpMap={adpMap}
              adpLoading={adpLoading}
              connectedPlatform={connectedPlatform}
            />
          ))}
        </div>
      )}
    </div>
  );
}
