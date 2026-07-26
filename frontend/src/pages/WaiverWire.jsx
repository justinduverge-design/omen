import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
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
    <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-muted)] p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Waiver Wire</p>
      <p className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">Yahoo session expired</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
        Reconnect your Yahoo account to restore your live waiver rankings.
      </p>
      <button
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-[var(--color-accent-muted)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20"
        type="button"
        onClick={() => { window.location.href = '/api/yahoo/auth'; }}
      >
        Reconnect Yahoo →
      </button>
    </div>
  );
}

function AuthGate() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Waiver Wire</p>
      <p className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">Sign in to get waiver picks</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
        Connect your fantasy platform and sign in to receive VORP-ranked waiver recommendations for your roster.
      </p>
      <Link
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-[var(--color-accent-muted)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20"
        to="/login"
      >
        Sign in →
      </Link>
    </div>
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
      <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Week (optional)
          <input
            className="mt-1 block w-24 min-h-[44px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-team-accent)]"
            max="18"
            min="1"
            placeholder="Current"
            type="number"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </label>

        <button
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin motion-reduce:hidden rounded-full border-2 border-black/30 border-t-black"
            />
          ) : null}
          {loading ? 'Loading' : 'Get Picks'}
        </button>
      </form>

      {error ? (
        <ErrorState title="Failed to load waiver picks" message={error} />
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
            <EmptyState
              eyebrow="Waiver Wire"
              title="No pickups found"
              message="No waiver candidates were returned. Your waiver wire may be empty or the platform connection needs refreshing."
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
