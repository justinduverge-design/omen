import { useRef, useState } from 'react';
import { searchPlayers } from '../data/nflPlayers.js';
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
const MAX_SUGGESTIONS = 8;

const INPUT_CLS =
  'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm ' +
  'text-[var(--color-text-primary)] outline-none transition-colors ' +
  'focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]';

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

// ─── Single player row with position-first layout + autocomplete ──────────────

function PlayerRow({ sectionTitle, index, player, totalCount, onChange, onRemove }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const closeTimeout = useRef(null);

  function computeSuggestions(position, query) {
    if (!query.trim()) return [];
    return searchPlayers(position, query).slice(0, MAX_SUGGESTIONS);
  }

  function handlePositionChange(position) {
    onChange(index, { position });
    // Re-filter suggestions with new position, keeping current name query
    if (player.name.trim()) {
      const next = computeSuggestions(position, player.name);
      setSuggestions(next);
      setShowSuggestions(next.length > 0);
    }
  }

  function handleNameChange(value) {
    onChange(index, { name: value });
    const next = computeSuggestions(player.position, value);
    setSuggestions(next);
    setShowSuggestions(next.length > 0);
    setActiveIdx(-1);
  }

  function selectSuggestion(p) {
    onChange(index, { name: p.name });
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIdx(-1);
  }

  function handleNameFocus() {
    clearTimeout(closeTimeout.current);
    if (suggestions.length > 0) setShowSuggestions(true);
  }

  function handleNameBlur() {
    // Delay so onMouseDown on a suggestion fires before close
    closeTimeout.current = setTimeout(() => setShowSuggestions(false), 150);
  }

  function handleKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 md:grid-cols-[72px_1fr_32px]">

      {/* ── Position ─────────────────────────────────────────────────────────── */}
      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
        Pos
        <select
          className={`mt-1 ${INPUT_CLS}`}
          value={player.position}
          onChange={(e) => handlePositionChange(e.target.value)}
        >
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </label>

      {/* ── Name + autocomplete dropdown ─────────────────────────────────────── */}
      <label className="relative text-xs font-semibold text-[var(--color-text-secondary)]">
        Name
        <input
          autoComplete="off"
          className={`mt-1 ${INPUT_CLS}`}
          value={player.name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={handleNameFocus}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul
            aria-label="Player suggestions"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1 shadow-lg"
            role="listbox"
          >
            {suggestions.map((p, si) => (
              <li
                key={p.id}
                aria-selected={si === activeIdx}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
                  si === activeIdx
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)]'
                }`}
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  selectSuggestion(p);
                }}
              >
                <span>{p.name}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-accent)', opacity: 0.7 }}
                >
                  {p.team}
                </span>
              </li>
            ))}
          </ul>
        )}
      </label>

      {/* ── Remove ×  ────────────────────────────────────────────────────────── */}
      <div className="flex items-end pb-0.5">
        <button
          aria-label={`Remove ${sectionTitle} player ${index + 1}`}
          className="flex h-9 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-base text-[var(--color-text-secondary)] transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={totalCount === 1}
          type="button"
          onClick={() => onRemove(index)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Side section (Send / Receive) ────────────────────────────────────────────

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
          <PlayerRow
            key={`${title}-${index}`}
            sectionTitle={title}
            index={index}
            player={player}
            totalCount={players.length}
            onChange={onChange}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function TradeAnalyzer() {
  const [send, setSend] = useState([{ ...EMPTY_PLAYER }]);
  const [receive, setReceive] = useState([{ ...EMPTY_PLAYER, position: 'WR' }]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  function updateSide(setter, index, patch) {
    setter((players) =>
      players.map((player, i) => (i === index ? { ...player, ...patch } : player)),
    );
  }

  function removeSidePlayer(setter, index) {
    setter((players) => players.filter((_, i) => i !== index));
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
      const message =
        caught instanceof ApiError && caught.status === 401
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
            disabled={loading}
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
