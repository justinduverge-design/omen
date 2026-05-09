import { useMemo, useState } from 'react';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
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

function ResultPanel({ result }) {
  if (!result) return null;

  const verdictStyles = {
    accept: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    decline: 'border-red-400/30 bg-red-400/10 text-red-300',
    neutral: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Result
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            {result.net_value > 0 ? '+' : ''}{result.net_value}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Confidence: {result.confidence}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${verdictStyles[result.verdict]}`}>
          {result.verdict}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ['Send', result.send],
          ['Receive', result.receive],
        ].map(([label, side]) => (
          <div className="rounded-md border border-slate-800 bg-slate-950 p-4" key={label}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-white">{label}</h3>
              <span className="text-sm text-slate-400">{side.total_value}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {side.players.map((player, index) => (
                <li className="flex items-center justify-between gap-3 text-sm" key={`${label}-${index}`}>
                  <span className="text-slate-300">{player.name}</span>
                  <span className="text-slate-500">{player.value}</span>
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    event.preventDefault();
    setError('');
    setLoading(true);

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Football
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
            Trade Analyzer
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Compare both sides with replacement-level value, injury adjustment,
            and missing-data confidence.
          </p>
        </section>

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
              {loading ? 'Comparing' : 'Compare Trade'}
            </button>
            {hasInvalidProjection ? (
              <p className="text-sm text-red-300">Projection must be a number.</p>
            ) : null}
          </div>
        </form>

        <ResultPanel result={result} />
      </main>

      <Footer />
    </div>
  );
}
