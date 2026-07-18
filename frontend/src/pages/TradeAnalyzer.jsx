import { useEffect, useMemo, useRef, useState } from 'react';
import { NFL_TEAMS } from '../data/nflTeams.js';
import { searchPlayers } from '../data/nflPlayers.js';
import { TRADE_PULSE } from '../data/tradePulse.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import MockBanner from '../components/ui/MockBanner.jsx';
import Button from '../components/ui/Button.jsx';
import Chip from '../components/ui/Chip.jsx';
import Input from '../components/ui/Input.jsx';
import MetricStrip from '../components/ui/MetricStrip.jsx';
import PlayerRow from '../components/ui/PlayerRow.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import { ApiError, apiFetch } from '../lib/api.js';
import { positionChipStyle } from '../lib/positionChip.js';
import { useTheme } from '../lib/themeMode.js';
import {
  DEFAULT_TRADE_DEAL_SHAPE,
  DEFAULT_TRADE_SCORING_FORMAT,
  EMPTY_TRADE_PLAYER,
  TRADE_DEAL_SHAPES,
  TRADE_POSITIONS,
  TRADE_SCORING_FORMATS,
  buildTradePayload,
  tradeDealShapeMeta,
} from '../lib/tradeForm.js';
import { buildTradeShareUrl } from '../lib/tradeShare.js';

const MAX_SUGGESTIONS = 8;

// ─── Compact player row with autocomplete ─────────────────────────────────

function TradeAnalyzerPlayerRow({ sectionTitle, index, player, totalCount, active, onActivate, onChange, onRemove }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const closeTimeout = useRef(null);
  const previousPosition = useRef(player.position);

  function computeSuggestions(position, query) {
    if (!query.trim()) return [];
    return searchPlayers(position, query).slice(0, MAX_SUGGESTIONS);
  }

  useEffect(() => {
    if (previousPosition.current === player.position) return;
    previousPosition.current = player.position;

    if (player.name.trim()) {
      const next = searchPlayers(player.position, player.name).slice(0, MAX_SUGGESTIONS);
      setSuggestions(next);
      setShowSuggestions(next.length > 0);
    }
  }, [player.name, player.position]);

  function handleNameChange(value) {
    onChange(index, { name: value });
    const next = computeSuggestions(player.position, value);
    setSuggestions(next);
    setShowSuggestions(next.length > 0);
    setActiveIdx(-1);
  }

  function selectSuggestion(p) {
    onChange(index, { name: p.name, team: p.team || '' });
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
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)_44px] items-center gap-2 rounded-md border p-2 transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-surface-1)]'
      }`}
      onFocusCapture={() => onActivate(index)}
    >
      <Chip className="w-12 shrink-0" size="sm" tone={`pos-${player.position.toLowerCase()}`}>
        {player.position}
      </Chip>

      <div className="relative min-w-0">
        <Input
          size="lg"
          role="combobox"
          aria-label={`${sectionTitle} player ${index + 1} name`}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls={`${sectionTitle}-${index}-suggestions`}
          aria-activedescendant={activeIdx >= 0 ? `${sectionTitle}-${index}-suggestions-${activeIdx}` : undefined}
          autoComplete="off"
          className="text-sm"
          value={player.name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => {
            onActivate(index);
            handleNameFocus();
          }}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul
            id={`${sectionTitle}-${index}-suggestions`}
            aria-label="Player suggestions"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1 shadow-lg"
            role="listbox"
          >
            {suggestions.map((p, si) => (
              <li
                key={p.id}
                id={`${sectionTitle}-${index}-suggestions-${si}`}
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
      </div>

      <div className="flex items-center">
        <button
          aria-label={`Remove ${sectionTitle} player ${index + 1}`}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] text-base text-[var(--color-text-secondary)] transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
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
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = Math.min(activeIndex, Math.max(players.length - 1, 0));
  const activePlayer = players[safeActiveIndex];

  function handleAddPlayer() {
    onAdd();
    setActiveIndex(players.length);
  }

  function handleRemovePlayer(index) {
    onRemove(index);
    setActiveIndex((current) => {
      if (current > index) return current - 1;
      if (current === index) return Math.max(0, index - 1);
      return current;
    });
  }

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-xs font-semibold text-[var(--color-text-secondary)]">
            Position
            <span className="sr-only">
              {' '}for {activePlayer?.name || `${title} player ${safeActiveIndex + 1}`}
            </span>
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {TRADE_POSITIONS.map((pos) => {
              const selected = activePlayer?.position === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  aria-pressed={selected}
                  className={`min-h-[44px] min-w-0 rounded-md border px-2 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                    selected
                      ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]'
                      : 'hover:border-[var(--color-accent)]'
                  }`}
                  style={selected ? {
                    background: 'var(--color-accent)',
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-text-on-accent)',
                  } : positionChipStyle(pos)}
                  onClick={() => onChange(safeActiveIndex, { position: pos })}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Players</p>
          <Button
            variant="secondary"
            size="lg"
            leadingIcon={<span aria-hidden="true" className="text-lg leading-none">+</span>}
            onClick={handleAddPlayer}
          >
            Add player
          </Button>
        </div>

        <div className="mt-2 space-y-2">
          {players.map((player, index) => (
            <TradeAnalyzerPlayerRow
              key={`${title}-${index}`}
              sectionTitle={title}
              index={index}
              player={player}
              totalCount={players.length}
              active={index === safeActiveIndex}
              onActivate={setActiveIndex}
              onChange={onChange}
              onRemove={handleRemovePlayer}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────

function ShareControls({ onCreateShare, shareStatus, shareUrl, shareError }) {
  return (
    <div className="mt-5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
            Share this result
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
            Creates a public snapshot. No connected-platform data or private league context is included.
          </p>
        </div>
        <Button
          className="shrink-0"
          variant="secondary"
          size="lg"
          aria-busy={shareStatus === 'creating'}
          disabled={shareStatus === 'creating'}
          loading={shareStatus === 'creating'}
          onClick={onCreateShare}
        >
          {shareStatus === 'creating' ? 'Creating link...' : 'Share result'}
        </Button>
      </div>

      {shareError && (
        <p className="mt-3 text-sm text-[var(--color-risk-high)]" role="alert">
          {shareError}
        </p>
      )}

      {shareUrl && (
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]" htmlFor="trade-share-url">
            Public link
          </label>
          <input
            id="trade-share-url"
            className="mt-2 w-full min-h-[44px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 font-mono text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--color-text-secondary)]" role="status">
              {shareStatus === 'copied' ? 'Link copied. Public snapshot expires in 30 days.' : 'Public snapshot expires in 30 days.'}
            </p>
            <a
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-accent)] transition-colors duration-150 hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              href={shareUrl}
            >
              Open share card
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result, onCreateShare, shareStatus, shareUrl, shareError, showShare = true }) {
  const { mode, team: teamAbbr } = useTheme();
  const cultureTag = useMemo(() => {
    if (mode !== 'team' || !teamAbbr) return null;
    return NFL_TEAMS.find((t) => t.abbr === teamAbbr)?.cultureTag ?? null;
  }, [mode, teamAbbr]);

  if (!result) return null;

  const verdictStyles = {
    accept: 'border-[var(--color-risk-low)]/30 bg-[var(--color-risk-low)]/10 text-[var(--color-risk-low)]',
    decline: 'border-[var(--color-risk-high)]/30 bg-[var(--color-risk-high)]/10 text-[var(--color-risk-high)]',
    neutral: 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent-hover)]',
  };

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Result
            </p>
            {cultureTag && (
              <span
                className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
                style={{
                  color: 'var(--color-accent)',
                  borderColor: 'color-mix(in srgb, var(--color-accent) 40%, var(--color-border) 60%)',
                }}
              >
                {cultureTag}
              </span>
            )}
          </div>
          <MetricStrip
            className="mt-2 min-w-52 border-0 py-0"
            explanation="Value Over Replacement Player - how much better this side is than a replacement-level option."
            label="VORP value"
            value={`${result.net_value > 0 ? '+' : ''}${result.net_value}`}
            tone={result.net_value > 0 ? 'positive' : result.net_value < 0 ? 'negative' : 'neutral'}
          />
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

      {showShare && (
        <ShareControls
          onCreateShare={onCreateShare}
          shareStatus={shareStatus}
          shareUrl={shareUrl}
          shareError={shareError}
        />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ['Send', result.send],
          ['Receive', result.receive],
        ].map(([label, side]) => (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4" key={label}>
            <MetricStrip label={`${label} total`} value={side.total_value} />
            <ul className="mt-3 space-y-2">
              {side.players.map((player, index) => (
                <li key={`${label}-${index}`}>
                  <PlayerRow
                    name={player.name}
                    position={player.position}
                    team={player.team}
                    valueSlot={<span className="text-sm text-[var(--color-text-tertiary)]">{player.value}</span>}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trade Room sidebar ───────────────────────────────────────────────────────

const TRADE_TIPS = [
  {
    title: 'The market overreacts',
    body: 'One bad week ≠ decline. Buy before the price recovers.',
  },
  {
    title: 'Trade the peak, not the crash',
    body: 'Sell before the schedule turns — not after.',
  },
  {
    title: 'The bench wins in October',
    body: "Waiver wire dries up. Depth you already own doesn't.",
  },
  {
    title: 'Scarcity beats volume',
    body: 'One true TE1 outweighs two streaming options.',
  },
];

function TradeTipsCard() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
        Omen · Strategy
      </p>
      <h3 className="mt-1 font-display text-lg font-bold text-[var(--color-text-primary)]">Trade Room</h3>
      <ul className="mt-4 space-y-4">
        {TRADE_TIPS.map((tip) => (
          <li key={tip.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--color-accent)' }}
            />
            <div>
              <p className="font-display text-sm font-semibold text-[var(--color-text-primary)]">{tip.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--color-text-secondary)]">{tip.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BuyLowCard() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
        Mock · Buy Low
      </p>
      <h3 className="mt-1 font-display text-lg font-bold text-[var(--color-text-primary)]">Targets</h3>
      <ul className="mt-4 divide-y divide-[var(--color-border)]">
        {TRADE_PULSE.buy_low.map((target) => (
          <li key={target.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {target.name}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <Chip tone={`pos-${target.position.toLowerCase()}`} size="sm">
                  {target.position}
                </Chip>
                <span className="text-xs text-[var(--color-text-tertiary)]">{target.team}</span>
              </div>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-[var(--color-text-secondary)]">
              {target.reason}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <MockBanner message="Mock buy-low targets - updated each preseason." />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TradeAnalyzer({
  compact = false,
  initialSend = [{ ...EMPTY_TRADE_PLAYER }],
  initialReceive = [{ ...EMPTY_TRADE_PLAYER, position: 'WR' }],
  initialScoringFormat = DEFAULT_TRADE_SCORING_FORMAT,
  initialDealShape = DEFAULT_TRADE_DEAL_SHAPE,
  initialResult = null,
  mockCompareResult = null,
  showShare = true,
  showSidebar = true,
}) {
  const [send, setSend] = useState(() => initialSend.map((player) => ({ ...player })));
  const [receive, setReceive] = useState(() => initialReceive.map((player) => ({ ...player })));
  const [scoringFormat, setScoringFormat] = useState(initialScoringFormat);
  const [dealShape, setDealShape] = useState(initialDealShape);
  const [result, setResult] = useState(initialResult);
  const [lastTradePayload, setLastTradePayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [shareStatus, setShareStatus] = useState('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const dealShapeMeta = tradeDealShapeMeta(dealShape);

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
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setError(null);
    setLoading(true);
    setHasSubmitted(true);

    try {
      const payload = buildTradePayload({ send, receive, scoringFormat });
      if (mockCompareResult) {
        setResult(mockCompareResult);
        setLastTradePayload(payload);
        setShareStatus('idle');
        setShareUrl('');
        setShareError('');
        return;
      }
      const comparison = await apiFetch('/api/trade/compare', {
        method: 'POST',
        body: payload,
      });
      setResult(comparison);
      setLastTradePayload(payload);
      setShareStatus('idle');
      setShareUrl('');
      setShareError('');
    } catch (caught) {
      const message =
        caught instanceof ApiError && caught.status === 401
          ? 'Sign in through the football app, then try again.'
          : caught.message || 'Trade comparison failed.';
      setError(message);
      setResult(null);
      setLastTradePayload(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateShare() {
    if (!lastTradePayload) {
      setShareError('Run the analyzer first, then share the result.');
      return;
    }

    setShareStatus('creating');
    setShareError('');

    try {
      const created = await apiFetch('/api/trade/share', {
        method: 'POST',
        body: lastTradePayload,
      });
      const url = buildTradeShareUrl(window.location.origin, created.hash);

      setShareUrl(url);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          setShareStatus('copied');
        } else {
          setShareStatus('ready');
        }
      } catch {
        setShareStatus('ready');
      }
    } catch (caught) {
      const unavailable = caught instanceof ApiError && caught.status === 503;
      setShareStatus('error');
      setShareError(
        unavailable
          ? 'Share storage is unavailable. Try again in a moment.'
          : caught.message || 'Could not create the share link. Try again.',
      );
    }
  }

  return (
    <div className={`grid gap-8 ${compact ? '' : 'xl:grid-cols-[1fr_256px]'}`}>

      {/* ── Main column: form + result ─────────────────────────────────────── */}
      <div className="flex flex-col gap-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                  Scoring
                </legend>
                <SegmentedControl
                  value={scoringFormat}
                  onValueChange={setScoringFormat}
                  size="lg"
                  className="flex flex-wrap"
                  aria-label="Scoring"
                >
                  {TRADE_SCORING_FORMATS.map((option) => (
                    <SegmentedControl.Item key={option.value} value={option.value}>
                      {option.label}
                    </SegmentedControl.Item>
                  ))}
                </SegmentedControl>
              </fieldset>
              <div>
                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                    Deal shape
                  </legend>
                  <SegmentedControl
                    value={dealShape}
                    onValueChange={setDealShape}
                    size="lg"
                    className="flex flex-wrap"
                    aria-label="Deal shape"
                  >
                    {TRADE_DEAL_SHAPES.map((option) => (
                      <SegmentedControl.Item key={option.value} value={option.value}>
                        {option.label}
                      </SegmentedControl.Item>
                    ))}
                  </SegmentedControl>
                </fieldset>
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                  {dealShapeMeta.description}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]">
            <PlayerRows
              title="Send"
              players={send}
              onAdd={() => setSend((players) => [...players, { ...EMPTY_TRADE_PLAYER }])}
              onChange={(index, patch) => updateSide(setSend, index, patch)}
              onRemove={(index) => removeSidePlayer(setSend, index)}
            />
            <div className="hidden items-center justify-center xl:flex" aria-hidden="true">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-xl font-semibold text-[var(--color-accent)]">
                &harr;
              </span>
            </div>
            <PlayerRows
              title="Receive"
              players={receive}
              onAdd={() => setReceive((players) => [...players, { ...EMPTY_TRADE_PLAYER, position: 'WR' }])}
              onChange={(index, patch) => updateSide(setReceive, index, patch)}
              onRemove={(index) => removeSidePlayer(setReceive, index)}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              aria-busy={loading}
              disabled={loading}
              loading={loading}
              type="submit"
            >
              {loading ? 'Comparing...' : 'Compare Trade'}
            </Button>
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

        <ResultPanel
          result={result?.verdict ? result : null}
          onCreateShare={handleCreateShare}
          shareStatus={shareStatus}
          shareUrl={shareUrl}
          shareError={shareError}
          showShare={showShare}
        />
      </div>

      {/* ── Trade Room sidebar ─────────────────────────────────────────────── */}
      {showSidebar && !compact && (
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <TradeTipsCard />
          <BuyLowCard />
        </aside>
      )}

    </div>
  );
}
