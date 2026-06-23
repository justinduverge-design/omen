import { useState } from 'react';
import { ApiError, apiFetch } from '../lib/api.js';

const PLATFORMS = ['yahoo', 'sleeper', 'espn'];

const SCORING_FORMATS = [
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'standard', label: 'Standard' },
];

const MOCK_STATES = [
  'success',
  'empty',
  'platform_disconnected',
  'espn_reauth_required',
  'espn_league_context_missing',
  'espn_import_blocked',
  'espn_recovery_needed',
  'error',
];

const CONFIDENCE_COLORS = {
  low: 'text-red-300',
  medium: 'text-amber-300',
  medium_high: 'text-amber-200',
  high: 'text-emerald-300',
};

const RISK_STYLES = {
  low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  medium: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  high: 'border-red-400/30 bg-red-400/10 text-red-300',
};

const SIGNAL_STYLES = {
  live: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  stub: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  mock: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  unavailable: 'border-slate-600 bg-slate-800/50 text-slate-500',
};

function SignalBadge({ status }) {
  const style = SIGNAL_STYLES[status] ?? SIGNAL_STYLES.unavailable;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}

function SignalsPanel({ signals }) {
  const entries = Object.entries(signals);
  if (!entries.length) return null;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Signals used
      </p>
      <ul className="space-y-2.5">
        {entries.map(([key, signal]) => (
          <li className="flex items-start justify-between gap-3 text-sm" key={key}>
            <span className="capitalize text-slate-400">
              {key.replace(/_/g, ' ')}
            </span>
            <div className="flex flex-col items-end gap-1">
              <SignalBadge status={signal.status} />
              {signal.message ? (
                <span className="max-w-xs text-right text-xs text-slate-600">
                  {signal.message}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceMeter({ confidence }) {
  if (!confidence) return null;
  const { score, label, rationale } = confidence;
  const colorClass = CONFIDENCE_COLORS[label] ?? 'text-slate-300';

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${colorClass}`}>{score}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          / 100
        </span>
        {label ? (
          <span className={`text-sm font-semibold ${colorClass}`}>
            {label.replace('_', ' ')}
          </span>
        ) : null}
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800">
        <div
          className="h-1.5 rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {rationale ? (
        <p className="text-xs text-slate-500">{rationale}</p>
      ) : null}
    </div>
  );
}

function RecoveryPanel({ platform, state }) {
  if (!platform) return null;
  const { name, recovery } = platform;
  const isEspn = name === 'espn';

  // Safe query params only — no credential values, Vault ids, or auth headers in URL.
  const accountHref = isEspn && state
    ? `/account?platform=espn&recovery=${state}`
    : '/account';

  return (
    <section className="rounded-lg border border-red-400/20 bg-red-400/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
        {isEspn ? 'ESPN connection required' : 'Platform disconnected'}
      </p>
      <h2 className="mt-2 text-xl font-semibold capitalize text-white">
        {name}
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
          className="mt-4 inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400"
          href={accountHref}
        >
          {recovery.cta} →
        </a>
      ) : null}
    </section>
  );
}

function EmptyStateCard({ explanation }) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        No move this week
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Stand pat.</h2>
      {explanation ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm leading-6 text-slate-300">{explanation.summary}</p>
          {explanation.why_it_matters ? (
            <p className="text-sm leading-6 text-slate-400">{explanation.why_it_matters}</p>
          ) : null}
          {explanation.risk ? (
            <p className="text-sm text-slate-500">{explanation.risk}</p>
          ) : null}
          {explanation.confidence ? (
            <p className="text-xs text-slate-500">{explanation.confidence}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ErrorCard({ error, onRetry }) {
  return (
    <section className="rounded-lg border border-red-400/30 bg-red-400/10 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Error</p>
      <p className="mt-2 text-sm text-slate-300">
        {error?.message ?? 'Omen could not generate an MVP Move right now.'}
      </p>
      {error?.retryable !== false ? (
        <button
          className="mt-4 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-amber-400 hover:text-amber-300"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </section>
  );
}

function RecommendationCard({ data }) {
  const { recommendation, signals } = data;
  if (!recommendation) return null;

  const {
    title,
    move,
    primary_player,
    comparison_player,
    expected_value_delta,
    confidence,
    risk,
    explanation,
  } = recommendation;

  const riskStyle = RISK_STYLES[risk?.level] ?? RISK_STYLES.medium;

  return (
    <div className="flex flex-col gap-5">
      {/* Primary card */}
      <section className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Omen of the Week
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
            {move ? (
              <p className="mt-1.5 text-sm leading-6 text-slate-400">{move}</p>
            ) : null}
          </div>
          {risk?.level ? (
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${riskStyle}`}>
              {risk.level} risk
            </span>
          ) : null}
        </div>

        {confidence ? (
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Confidence
            </p>
            <ConfidenceMeter confidence={confidence} />
          </div>
        ) : null}

        {expected_value_delta?.points ? (
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-emerald-300">
              +{Number(expected_value_delta.points).toFixed(1)} pts
            </span>
            {expected_value_delta.label ? (
              <span className="text-xs text-slate-500">
                {expected_value_delta.label} projected advantage
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Plain-English explanation */}
      {explanation ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Why this move
          </p>
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-200">{explanation.summary}</p>
            {explanation.why_it_matters ? (
              <p className="text-sm leading-6 text-slate-400">{explanation.why_it_matters}</p>
            ) : null}
            {explanation.risk ? (
              <p className="text-sm text-slate-500">{explanation.risk}</p>
            ) : null}
            {risk?.reasons?.length ? (
              <ul className="list-inside list-disc space-y-1">
                {risk.reasons.map((reason, i) => (
                  <li className="text-xs text-slate-500" key={i}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {explanation.data_used?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {explanation.data_used.map((item) => (
                <span
                  className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Player comparison */}
      {(primary_player || comparison_player) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {primary_player ? (
            <div className="rounded-md border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Start
              </p>
              <p className="mt-1 text-base font-semibold text-white">{primary_player.name}</p>
              <p className="text-sm text-slate-400">
                {primary_player.position} · {primary_player.team}
              </p>
            </div>
          ) : null}
          {comparison_player ? (
            <div className="rounded-md border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Bench
              </p>
              <p className="mt-1 text-base font-semibold text-white">{comparison_player.name}</p>
              <p className="text-sm text-slate-400">
                {comparison_player.position} · {comparison_player.team}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Signals */}
      {signals && Object.keys(signals).length ? (
        <SignalsPanel signals={signals} />
      ) : null}
    </div>
  );
}

function OmenResult({ data, onRetry }) {
  if (!data) return null;

  const { state, platform, explanation, error } = data;

  if (state === 'success') return <RecommendationCard data={data} />;

  if (state === 'empty') return <EmptyStateCard explanation={explanation} />;

  if (
    state === 'platform_disconnected'
    || state === 'espn_reauth_required'
    || state === 'espn_league_context_missing'
    || state === 'espn_import_blocked'
    || state === 'espn_recovery_needed'
  ) return <RecoveryPanel platform={platform} state={state} />;

  if (state === 'error') return <ErrorCard error={error} onRetry={onRetry} />;

  return null;
}

export default function Omen() {
  const [platform, setPlatform] = useState('yahoo');
  const [leagueId, setLeagueId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [week, setWeek] = useState(1);
  const [scoringFormat, setScoringFormat] = useState('ppr');
  const [useMock, setUseMock] = useState(false);
  const [mockState, setMockState] = useState('success');

  const [result, setResult] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchOmen() {
    setFetchError('');
    setLoading(true);
    setResult(null);

    try {
      const body = {
        platform,
        season: new Date().getFullYear(),
        week: Number(week),
        scoring_format: scoringFormat,
        use_mock_data: useMock,
      };

      if (leagueId.trim()) body.league_id = leagueId.trim();
      if (teamId.trim()) body.team_id = teamId.trim();
      if (useMock) body.mock_state = mockState;

      const data = await apiFetch('/api/omen/mvp-move', {
        method: 'POST',
        body,
      });
      setResult(data);
    } catch (caught) {
      // If the backend returned a structured Omen envelope on a non-OK status
      // (e.g. 500 error state), route it through OmenResult so the state
      // machine handles it rather than showing a raw error banner.
      if (caught instanceof ApiError && caught.body?.state) {
        setResult(caught.body);
      } else {
        const message = caught instanceof ApiError
          ? (typeof caught.body?.error === 'string' ? caught.body.error : caught.message)
          : caught.message || 'Could not get your MVP Move.';
        setFetchError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    fetchOmen();
  }

  return (
    <div className="flex flex-col gap-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-base font-semibold text-white">Your team</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-400">
              Platform
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-400">
              League ID
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                placeholder="e.g. 414.l.12345"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
              />
            </label>

            <label className="text-xs font-semibold text-slate-400">
              Team ID
              <span className="ml-1 font-normal text-slate-600">(optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                placeholder="e.g. 7"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              />
            </label>

            <label className="text-xs font-semibold text-slate-400">
              Week
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                max={18}
                min={1}
                type="number"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
              />
            </label>

            <label className="text-xs font-semibold text-slate-400">
              Scoring format
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                value={scoringFormat}
                onChange={(e) => setScoringFormat(e.target.value)}
              >
                {SCORING_FORMATS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Dev / preview mock controls */}
        <details className="rounded-md border border-slate-800">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-400">
            Preview / mock mode
          </summary>
          <div className="flex flex-wrap items-center gap-5 border-t border-slate-800 px-4 py-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <input
                className="accent-amber-400"
                checked={useMock}
                type="checkbox"
                onChange={(e) => setUseMock(e.target.checked)}
              />
              Use mock data
            </label>
            {useMock ? (
              <label className="text-xs font-semibold text-slate-400">
                Mock state
                <select
                  className="ml-2 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-amber-400"
                  value={mockState}
                  onChange={(e) => setMockState(e.target.value)}
                >
                  {MOCK_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <p className="text-xs text-slate-600">
              Mock mode is for local preview only. Production results are always live.
            </p>
          </div>
        </details>

        {fetchError ? (
          <div className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {fetchError}
          </div>
        ) : null}

        <div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950/30 border-t-amber-950"
              />
            ) : null}
            {loading ? 'Reading your roster…' : 'Get my MVP Move'}
          </button>
        </div>
      </form>

      <OmenResult data={result} onRetry={fetchOmen} />
    </div>
  );
}
