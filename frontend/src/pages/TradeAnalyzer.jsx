import { useMemo, useState } from 'react';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import { ApiError, apiFetch } from '../lib/api.js';

const EMPTY_PLAYER = {
  name: '',
  position: 'RB',
  projected_points: '',
  status: '',
};

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
const STATUSES = ['', 'Q', 'OUT', 'IR', 'P'];

function cleanPlayer(player) {
  const cleaned = {
    name: player.name.trim() || 'Unknown',
    position: player.position,
  };

  if (player.projected_points !== '') {
    cleaned.projected_points = Number(player.projected_points);
  }
  if (player.status) {
    cleaned.status = player.status;
  }

  return cleaned;
}

function PlayerRows({ title, players, onChange, onAdd, onRemove }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <button
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          type="button"
          onClick={onAdd}
        >
          Add
        </button>
      </div>

      <div className="space-y-3">
        {players.map((player, index) => (
          <div
            className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 md:grid-cols-[1fr_96px_120px_96px_auto]"
            key={`${title}-${index}`}
          >
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Name
              <input
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
                value={player.name}
                onChange={(event) => onChange(index, { name: event.target.value })}
              />
            </label>

            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Pos
              <select
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
                value={player.position}
                onChange={(event) => onChange(index, { position: event.target.value })}
              >
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Projection
              <input
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
                min="0"
                step="0.1"
                type="number"
                value={player.projected_points}
                onChange={(event) => onChange(index, { projected_points: event.target.value })}
              />
            </label>

            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Status
              <select
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
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
              className="self-end rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
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

function ResultPanel({ result }) {
  if (!result) return null;

  const verdictStyles = {
    accept: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    decline: 'border-red-400/30 bg-red-400/10 text-red-300',
    neutral: 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent-hover)]',
  };

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
            Result
          </p>
          <h2 className="mt-2 font-mono text-3xl font-semibold text-[var(--color-text-primary)]">
            {result.net_value > 0 ? '+' : ''}{result.net_value}
          </h2>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
            VORP value
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Confidence: {result.confidence}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${verdictStyles[result.verdict]}`}>
          {result.verdict}
        </span>
      </div>
      {result.explanation ? (
        <p className="mt-4 rounded-md border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-4 py-3 text-sm leading-6 text-[var(--color-text-primary)]">
          {result.explanation}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ['Send', result.send],
          ['Receive', result.receive],
        ].map(([label, side]) => (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4" key={label}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--color-text-primary)]">{label}</h3>
              <span className="text-sm text-[var(--color-text-secondary)]">{side.total_value}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {side.players.map((player, index) => (
                <li className="flex items-center justify-between gap-3 text-sm" key={`${label}-${index}`}>
                  <span className="text-[var(--color-text-primary)]">{player.name}</span>
                  <span className="text-[var(--color-text-tertiary)]">{player.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TradeAnalyzer() {
  const [send, setSend] = useState([
    { ...EMPTY_PLAYER, name: 'Bench RB', projected_points: '10' },
  ]);
  const [receive, setReceive] = useState([
    { ...EMPTY_PLAYER, name: 'Starter WR', position: 'WR', projected_points: '14' },
  ]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const hasInvalidProjection = useMemo(() => (
    [...send, ...receive].some((player) => (
      player.projected_points !== '' && !Number.isFinite(Number(player.projected_points))
    ))
  ), [send, receive]);

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
    event?.preventDefault();
    setError(null);
    setLoading(true);
    setHasSubmitted(true);

    try {
      const payload = {
        send: send.map(cleanPlayer),
        receive: receive.map(cleanPlayer),
      };
      const comparison = await apiFetch('/api/trade/compare', {
        method: 'POST',
        body: payload,
      });
      setResult(comparison);
    } catch (caught) {
      const message = caught instanceof ApiError && caught.status === 401
        ? 'Sign in through the football app, then try again.'
        : caught.message || 'Trade comparison failed.';
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="flex flex-col gap-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 xl:grid-cols-2">
            <PlayerRows
              title="Send"
              players={send}
              onAdd={() => setSend((players) => [...players, { ...EMPTY_PLAYER }])}
              onChange={(index, patch) => updateSide(setSend, index, patch)}
              onRemove={(index) => removeSidePlayer(setSend, index)}
            />
            <PlayerRows
              title="Receive"
              players={receive}
              onAdd={() => setReceive((players) => [...players, { ...EMPTY_PLAYER }])}
              onChange={(index, patch) => updateSide(setReceive, index, patch)}
              onRemove={(index) => removeSidePlayer(setReceive, index)}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || hasInvalidProjection}
              type="submit"
            >
              {loading ? (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
                />
              ) : null}
              {loading ? 'Comparing...' : 'Compare Trade'}
            </button>
            {hasInvalidProjection ? (
              <p className="text-sm text-red-300">Projection must be a number.</p>
            ) : null}
          </div>
        </form>

        {error && (
          <ErrorState
            title="Trade comparison failed"
            message={error}
            onRetry={handleSubmit}
          />
        )}

        {!loading && !error && hasSubmitted && result && !result.verdict && (
          <EmptyState
            eyebrow="Trade Analyzer"
            title="No result returned"
            message="The comparison returned an incomplete result. Try adjusting the player details and running again."
          />
        )}

        <ResultPanel result={result?.verdict ? result : null} />
      </div>
  );
}
