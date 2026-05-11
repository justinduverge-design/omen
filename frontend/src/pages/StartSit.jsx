import { useMemo, useState } from 'react';
import { ApiError, apiFetch } from '../lib/api.js';

const EMPTY_PLAYER = {
  name: '',
  position: 'RB',
  projected_points: '',
  status: '',
};

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
const STATUSES = ['', 'Q', 'OUT', 'IR', 'P'];

function eligiblePositions(position) {
  if (position === 'FLEX') return ['RB', 'WR', 'TE', 'FLEX'];
  if (position === 'DEF') return ['DEF', 'D/ST', 'DST'];
  return [position];
}

function cleanPlayer(player, index, side) {
  const position = player.position;

  return {
    name: player.name.trim() || `Unknown ${side} ${index + 1}`,
    position,
    eligible_positions: eligiblePositions(position),
    projected_points: Number(player.projected_points) || 0,
    status: player.status,
    player_key: `${side}-${index + 1}`,
  };
}

function formatDelta(delta) {
  const value = Number(delta) || 0;
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} pts`;
}

function PlayerRows({ title, players, onChange, onAdd, onRemove }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <button
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-400 hover:text-amber-300"
          type="button"
          onClick={onAdd}
        >
          Add
        </button>
      </div>

      <div className="space-y-3">
        {players.map((player, index) => (
          <div
            className="grid gap-3 rounded-md border border-slate-800 bg-slate-950 p-3 md:grid-cols-[1fr_96px_120px_96px_auto]"
            key={`${title}-${index}`}
          >
            <label className="text-xs font-semibold text-slate-400">
              Name
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                value={player.name}
                onChange={(event) => onChange(index, { name: event.target.value })}
              />
            </label>

            <label className="text-xs font-semibold text-slate-400">
              Pos
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                value={player.position}
                onChange={(event) => onChange(index, { position: event.target.value })}
              >
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-400">
              Projection
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                min="0"
                step="0.1"
                type="number"
                value={player.projected_points}
                onChange={(event) => onChange(index, { projected_points: event.target.value })}
              />
            </label>

            <label className="text-xs font-semibold text-slate-400">
              Status
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
                value={player.status}
                onChange={(event) => onChange(index, { status: event.target.value })}
              >
                {STATUSES.map((status) => (
                  <option key={status || 'empty'} value={status}>
                    {status || '-'}
                  </option>
                ))}
              </select>
            </label>

            <button
              aria-label={`Remove ${title} player ${index + 1}`}
              className="self-end rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={players.length === 1}
              type="button"
              onClick={() => onRemove(index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConfidenceBadge({ confidence }) {
  return (
    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">
      {confidence}% confidence
    </span>
  );
}

function ResultPanel({ result }) {
  if (!result) return null;

  const lineupRecommendations = result.lineup_recommendations || [];
  const waiverRecommendations = result.waiver_recommendations || [];

  return (
    <section className="space-y-5">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Result
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-white">
          Start/Sit Recommendations
        </h2>

        {lineupRecommendations.length ? (
          <div className="mt-5 space-y-3">
            {lineupRecommendations.map((recommendation, index) => (
              <article
                className="rounded-md border border-slate-800 bg-slate-950 p-4"
                key={`${recommendation.slot}-${index}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      Start {recommendation.to?.name || 'Player'} over {recommendation.from?.name || 'Player'} - {formatDelta(recommendation.delta)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {recommendation.slot} slot
                    </p>
                  </div>
                  <ConfidenceBadge confidence={recommendation.confidence} />
                </div>
                {recommendation.reasoning ? (
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {recommendation.reasoning}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            No lineup swaps returned.
          </p>
        )}
      </section>

      {waiverRecommendations.length ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-white">Waiver Recommendations</h2>
          <div className="mt-4 space-y-3">
            {waiverRecommendations.map((recommendation, index) => (
              <article
                className="rounded-md border border-slate-800 bg-slate-950 p-4"
                key={`${recommendation.position}-${index}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      Add {recommendation.add?.name || 'Player'} over {recommendation.drop?.name || 'Player'} - {formatDelta(recommendation.delta)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {recommendation.position}
                    </p>
                  </div>
                  <ConfidenceBadge confidence={recommendation.confidence} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {result.explanation ? (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
          {result.explanation}
        </p>
      ) : null}
    </section>
  );
}

export default function StartSit() {
  const [starters, setStarters] = useState([
    { ...EMPTY_PLAYER, name: 'Current Starter', projected_points: '10' },
  ]);
  const [bench, setBench] = useState([
    { ...EMPTY_PLAYER, name: 'Bench Option', position: 'WR', projected_points: '14' },
  ]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasInvalidProjection = useMemo(() => (
    [...starters, ...bench].some((player) => (
      player.projected_points !== '' && !Number.isFinite(Number(player.projected_points))
    ))
  ), [starters, bench]);

  function updateSide(setter, index, patch) {
    setter((players) => (
      players.map((player, playerIndex) => (
        playerIndex === index ? { ...player, ...patch } : player
      ))
    ));
  }

  function removeSidePlayer(setter, index) {
    setter((players) => players.filter((_, playerIndex) => playerIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const recommendation = await apiFetch('/api/optimizer', {
        method: 'POST',
        body: {
          slots: {
            starters: starters.map((player, index) => cleanPlayer(player, index, 'starter')),
            bench: bench.map((player, index) => cleanPlayer(player, index, 'bench')),
          },
        },
      });
      setResult(recommendation);
    } catch (caught) {
      const message = caught instanceof ApiError && caught.status === 401
        ? 'Sign in through the football app, then try again.'
        : caught.message || 'Start/sit optimization failed.';
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Lineup Decisions
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Start/Sit
        </h2>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Compare starters against bench options with projection delta,
          availability, and confidence-aware reasoning.
        </p>
      </section>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 xl:grid-cols-2">
          <PlayerRows
            title="Starters"
            players={starters}
            onAdd={() => setStarters((players) => [...players, { ...EMPTY_PLAYER }])}
            onChange={(index, patch) => updateSide(setStarters, index, patch)}
            onRemove={(index) => removeSidePlayer(setStarters, index)}
          />
          <PlayerRows
            title="Bench"
            players={bench}
            onAdd={() => setBench((players) => [...players, { ...EMPTY_PLAYER }])}
            onChange={(index, patch) => updateSide(setBench, index, patch)}
            onRemove={(index) => removeSidePlayer(setBench, index)}
          />
        </div>

        {error ? (
          <div className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || hasInvalidProjection}
            type="submit"
          >
            {loading ? 'Optimizing' : 'Optimize Lineup'}
          </button>
          {hasInvalidProjection ? (
            <p className="text-sm text-red-300">Projection must be a number.</p>
          ) : null}
        </div>
      </form>

      <ResultPanel result={result} />
    </main>
  );
}
