import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card } from '../components/ui/index.js';
import { ApiError, apiFetch } from '../lib/api.js';
import { positionChipStyle } from '../lib/positionChip.js';
import { summarizeTradeSnapshot } from '../lib/tradeShare.js';

function StateCard({ eyebrow, title, message, action }) {
  return (
    <Card variant="solid" className="p-8 text-center">
      <Card.Header eyebrow={eyebrow} title={title} className="justify-center text-center [&>div]:items-center" />
      {message && <Card.Body className="mx-auto max-w-xl">{message}</Card.Body>}
      {action && (
        <Card.Footer className="justify-center">
          <Button variant="primary" size="md" asChild>
            <Link to={action.href}>{action.label}</Link>
          </Button>
        </Card.Footer>
      )}
    </Card>
  );
}

function PlayerList({ label, players = [], totalValue }) {
  return (
    <Card variant="outlined">
      <Card.Header
        title={label}
        trailing={Number.isFinite(Number(totalValue)) && (
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">{totalValue}</span>
        )}
      />
      <Card.Body>
        <ul className="space-y-3">
          {players.map((player, index) => (
            <li className="flex items-center justify-between gap-3 text-sm" key={`${label}-${player.name}-${index}`}>
              <span className="min-w-0 text-[var(--color-text-primary)]">{player.name}</span>
              <span
                className="shrink-0 rounded border px-1.5 py-px text-[10px] font-bold uppercase tracking-wide"
                style={positionChipStyle(player.position)}
              >
                {player.position}
              </span>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
}

export default function TradeShare() {
  const { hash } = useParams();
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadSnapshot() {
      setStatus('loading');
      setMessage('');

      try {
        const data = await apiFetch(`/api/trade/share/${hash}`);
        if (!alive) return;
        setSnapshot(data);
        setStatus('ready');
      } catch (caught) {
        if (!alive) return;
        const missing = caught instanceof ApiError && (caught.status === 400 || caught.status === 404);
        setStatus('error');
        setMessage(
          missing
            ? 'This share link is expired or no longer exists. Run the analyzer again to create a fresh snapshot.'
            : caught.message || 'The shared trade could not load. Try again in a moment.',
        );
      }
    }

    loadSnapshot();
    return () => {
      alive = false;
    };
  }, [hash]);

  const summary = useMemo(
    () => (snapshot ? summarizeTradeSnapshot(snapshot) : null),
    [snapshot],
  );

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <StateCard
          eyebrow="Trade Share"
          title="Reading the snapshot"
          message="Omen is loading the public trade result."
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <StateCard
          eyebrow="Trade Share"
          title="Share link is gone"
          message={message}
          action={{ href: '/trade', label: 'Run a new trade' }}
        />
      </div>
    );
  }

  const { result = {}, trade = {} } = snapshot;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <Card variant="solid" className="p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">
              Trade Analyzer
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--color-text-primary)] md:text-4xl">
              {summary.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
              {summary.description}
            </p>
          </div>
          <div className="rounded-md border border-[var(--color-team-accent)]/30 bg-[var(--color-team-accent)]/10 px-4 py-3 text-left md:min-w-44">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
              VORP value
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold text-[var(--color-text-primary)]">
              {summary.netValueLabel}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
            {summary.confidenceScore} · {summary.confidenceLabel}
          </span>
          <span className="rounded-full border border-[var(--color-risk-medium)]/40 bg-[var(--color-risk-medium)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-risk-medium)]">
            {summary.riskLabel}
          </span>
          <span className="rounded-full border border-[var(--color-data-mock)]/40 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
            {summary.dataLabel}
          </span>
          <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-tertiary)]">
            {summary.expiresLabel}
          </span>
        </div>

        <p className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Public snapshot only. It does not include connected-platform context, ESPN cookies, tokens, or private league data.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <PlayerList label="Send" players={result.send?.players || trade.send} totalValue={result.send?.total_value} />
          <PlayerList label="Receive" players={result.receive?.players || trade.receive} totalValue={result.receive?.total_value} />
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" size="md" asChild>
          <Link to="/trade">Run your own trade</Link>
        </Button>
        <Button variant="secondary" size="md" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
