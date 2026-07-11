import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input, PageHero } from '../components/ui/index.js';
import MockBanner from '../components/ui/MockBanner.jsx';
import { ApiError, apiFetch } from '../lib/api.js';
import { positionChipStyle } from '../lib/positionChip.js';
import { supabase } from '../lib/supabase.js';

const PLATFORM_LABELS = { yahoo: 'Yahoo', sleeper: 'Sleeper', espn: 'ESPN' };

function PlayerRow({ rank, player }) {
  const vorpDisplay = player.vorp_delta != null
    ? `${player.vorp_delta >= 0 ? '+' : ''}${player.vorp_delta.toFixed(1)}`
    : '—';
  const ptsDisplay = player.projected_points != null
    ? player.projected_points.toFixed(1)
    : '—';

  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-4">
      <p className="w-5 flex-shrink-0 pt-0.5 text-sm font-semibold text-[var(--color-text-tertiary)]">{rank}</p>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--color-text-primary)]">{player.name}</p>
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
            style={positionChipStyle(player.position)}
          >
            {player.position}
          </span>
          <p className="text-xs text-[var(--color-text-tertiary)]">{player.team}</p>
        </div>
        <p className="mt-1.5 text-sm leading-5 text-[var(--color-text-secondary)]">{player.reason}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{ptsDisplay} pts</p>
        <p
          className="text-xs font-semibold"
          style={{ color: player.vorp_delta >= 0 ? 'var(--color-risk-low)' : 'var(--color-text-secondary)' }}
        >
          {vorpDisplay} VORP
        </p>
      </div>
    </div>
  );
}

function TokenExpiredState() {
  return (
    <Card variant="error" tone="risk">
      <Card.Header eyebrow="Waiver Wire" title="Yahoo session expired" />
      <Card.Body>
        Reconnect your Yahoo account to restore your live waiver rankings.
      </Card.Body>
      <Card.Footer>
        <Button variant="secondary" size="sm" onClick={() => { window.location.href = '/api/yahoo/auth'; }}>
          Reconnect Yahoo →
        </Button>
      </Card.Footer>
    </Card>
  );
}

function AuthGate() {
  return (
    <Card variant="solid">
      <Card.Header eyebrow="Waiver Wire" title="Sign in to get waiver picks" />
      <Card.Body>
        Connect your fantasy platform and sign in to receive VORP-ranked waiver recommendations for your roster.
      </Card.Body>
      <Card.Footer>
        <Button variant="primary" size="md" asChild>
          <Link to="/login">Sign in →</Link>
        </Button>
      </Card.Footer>
    </Card>
  );
}

export default function WaiverWire() {
  const [session, setSession] = useState(undefined);
  const [week, setWeek] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data?.session ?? null);
    }).catch(() => { if (mounted) setSession(null); });

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });
    return () => { mounted = false; data?.subscription?.unsubscribe(); };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setTokenExpired(false);
    setResult(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (week) params.set('week', week);
      const qs = params.toString();
      const data = await apiFetch(`/api/optimizer/waiver${qs ? `?${qs}` : ''}`);
      setResult(data);
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status === 401 &&
        caught.message?.toLowerCase().includes('yahoo token expired')
      ) {
        setTokenExpired(true);
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : caught.message || 'Failed to load waiver recommendations.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (session === undefined) {
    return (
      <div className="flex h-32 items-center justify-center" aria-label="Loading" role="status">
        <span
          className="h-5 w-5 animate-spin motion-reduce:hidden rounded-full border-2"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
          aria-hidden="true"
        />
      </div>
    );
  }

  if (!session) return <AuthGate />;
  if (tokenExpired) return <TokenExpiredState />;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="WAIVER"
        title="Waiver Wire"
        subtitle="VORP-ranked pickups for your roster."
      />

      <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="font-sans text-xs font-medium uppercase tracking-[0.05em] text-[var(--color-text-primary)]">
            Week (optional)
          </span>
          <Input
            className="w-24"
            max="18"
            min="1"
            placeholder="Current"
            type="number"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </label>

        <Button variant="primary" size="md" type="submit" loading={loading} disabled={loading}>
          {loading ? 'Loading' : 'Get Picks'}
        </Button>
      </form>

      {error ? (
        <Card variant="error" tone="risk">
          <Card.Header title="Failed to load waiver picks" />
          <Card.Body>{error}</Card.Body>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-4">
          {result.is_mock && <MockBanner message="Preview — mock data. Live waiver rankings connect to your roster when the season begins." />}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
                Top Pickups — Week {result.week}
              </p>
              {result.platform && (
                <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                  {PLATFORM_LABELS[result.platform] ?? result.platform}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">{result.pool_size} players scanned</p>
          </div>

          {result.recommendations?.length > 0 ? (
            <div className="space-y-3">
              {result.recommendations.map((player, i) => (
                <PlayerRow key={player.name + i} rank={i + 1} player={player} />
              ))}
            </div>
          ) : (
            <Card variant="empty">
              <Card.Header eyebrow="Waiver Wire" title="No pickups found" />
              <Card.Body>
                No waiver candidates were returned. Your waiver wire may be empty or the platform connection needs refreshing.
              </Card.Body>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
