import { useMemo, useState } from 'react';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import { ApiError, apiFetch } from '../lib/api.js';

const EMPTY_PLAYER = {
  name: '',
  position: 'RB',
  projected_points: '',
};

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K'];

function cleanPlayer(player) {
  return {
    name: player.name.trim(),
    position: player.position,
    projected_points: Number(player.projected_points),
  };
}

function winnerName(result, playerA, playerB) {
  if (!result) return '';
  return result.winner === 'A' ? playerA.name.trim() : playerB.name.trim();
}

function formatAdvantage(pointsDelta) {
  const value = Number(pointsDelta) || 0;
  return `+${value.toFixed(1)} pts projected advantage`;
}

function PlayerInput({ label, player, onChange }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-base font-semibold text-white">{label}</h2>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_112px_144px]">
        <label className="text-xs font-semibold text-slate-400">
          Player name
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
            placeholder="e.g. Tyreek Hill"
            value={player.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>

        <label className="text-xs font-semibold text-slate-400">
          Position
          <select
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
            value={player.position}
            onChange={(event) => onChange({ position: event.target.value })}
          >
            {POSITIONS.map((position) => (
              <option key={position} value={position}>{position}</option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-400">
          Projected pts
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
            min="0"
            placeholder="0.0"
            step="0.1"
            type="number"
            value={player.projected_points}
            onChange={(event) => onChange({ projected_points: event.target.value })}
          />
        </label>
      </div>
    </section>
  );
}

function SignalsList({ signals }) {
  if (!signals?.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Signals</p>
      <div className="flex flex-wrap gap-2">
        {signals.map((signal, i) => {
          const isHigh = signal.weight === 'high';
          const isMedium = signal.weight === 'medium';
          const chipClass = isHigh
            ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            : isMedium
            ? 'border-slate-600 bg-slate-800/80 text-slate-200'
            : 'border-slate-700 bg-slate-800 text-slate-400';
          const valueClass = isHigh ? 'text-amber-400/70' : 'text-slate-500';
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${chipClass}`}
            >
              {signal.label}
              <span className={valueClass}>{signal.value}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ResultPanel({ result, playerA, playerB }) {
  if (!result) return null;

  const name = winnerName(result, playerA, playerB);

  return (
    <section className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
        Recommendation
      </p>
      <h2 className="mt-2 text-3xl font-semibold text-white">
        Start {name || 'the higher projection'}
      </h2>
      <p className="mt-2 text-base font-semibold text-slate-300">
        {formatAdvantage(result.pointsDelta)}
      </p>
      <p className="mt-4 rounded-md border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100">
        {result.recommendation}
      </p>
      <p className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
        {result.explanation ?? 'Reasoning unavailable — recommendation based on projected points.'}
      </p>
      <SignalsList signals={result.signals} />
    </section>
  );
}

export default function StartSit() {
  const [playerA, setPlayerA] = useState({
    ...EMPTY_PLAYER,
    name: 'Player A',
    projected_points: '10',
  });
  const [playerB, setPlayerB] = useState({
    ...EMPTY_PLAYER,
    name: 'Player B',
    position: 'WR',
    projected_points: '14',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const hasInvalidProjection = useMemo(() => (
    [playerA, playerB].some((player) => (
      player.projected_points === '' || !Number.isFinite(Number(player.projected_points))
    ))
  ), [playerA, playerB]);

  const hasMissingName = useMemo(() => (
    [playerA, playerB].some((player) => player.name.trim().length === 0)
  ), [playerA, playerB]);

  function updatePlayer(setter, patch) {
    setter((player) => ({ ...player, ...patch }));
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    setError(null);
    setLoading(true);
    setHasSubmitted(true);

    try {
      const recommendation = await apiFetch('/api/start-sit', {
        method: 'POST',
        body: {
          playerA: cleanPlayer(playerA),
          playerB: cleanPlayer(playerB),
        },
      });
      setResult(recommendation);
    } catch (caught) {
      const message = caught instanceof ApiError
        ? caught.message
        : caught.message || 'Start/sit comparison failed.';
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const isSubmitDisabled = loading || hasInvalidProjection || hasMissingName;

  return (
    <div className="flex flex-col gap-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 xl:grid-cols-2">
          <PlayerInput
            label="Player A"
            player={playerA}
            onChange={(patch) => updatePlayer(setPlayerA, patch)}
          />
          <PlayerInput
            label="Player B"
            player={playerB}
            onChange={(patch) => updatePlayer(setPlayerB, patch)}
          />
        </div>

        {error && (
          <ErrorState
            title="Comparison failed"
            message={error}
            onRetry={handleSubmit}
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitDisabled}
            type="submit"
          >
            {loading ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950"
              />
            ) : null}
            {loading ? 'Comparing' : 'Compare'}
          </button>
          {hasMissingName ? (
            <p className="text-sm text-red-300">Both players need a name.</p>
          ) : null}
          {hasInvalidProjection ? (
            <p className="text-sm text-red-300">Projected points must be a number.</p>
          ) : null}
        </div>
      </form>

      {!loading && !error && hasSubmitted && result && !result.winner && (
        <EmptyState
          eyebrow="Start/Sit"
          title="No recommendation returned"
          message="The comparison returned an incomplete result. Try adjusting the player names and projections."
        />
      )}

      <ResultPanel result={result?.winner ? result : null} playerA={playerA} playerB={playerB} />
    </div>
  );
}
