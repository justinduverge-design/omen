import { useEffect, useState } from 'react';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import MockBanner from '../components/ui/MockBanner.jsx';
import { ApiError, apiFetch } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import { startYahooOAuth } from '../lib/yahooAuth.js';

const PLATFORM_LABELS = { yahoo: 'Yahoo', sleeper: 'Sleeper', espn: 'ESPN' };

function PositionBadge({ position }) {
  const colors = {
    QB: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    RB: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    WR: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    TE: 'border-purple-400/30 bg-purple-400/10 text-purple-300',
    K: 'border-slate-600 bg-slate-800 text-slate-300',
    DEF: 'border-slate-600 bg-slate-800 text-slate-300',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${colors[position] ?? colors.K}`}
    >
      {position}
    </span>
  );
}

function PlayerRow({ rank, player }) {
  const vorpDisplay = player.vorp_delta != null
    ? `${player.vorp_delta >= 0 ? '+' : ''}${player.vorp_delta.toFixed(1)}`
    : '—';
  const ptsDisplay = player.projected_points != null
    ? player.projected_points.toFixed(1)
    : '—';

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
      <p className="w-5 flex-shrink-0 pt-0.5 text-sm font-semibold text-slate-500">{rank}</p>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-white">{player.name}</p>
          <PositionBadge position={player.position} />
          <p className="text-xs text-slate-500">{player.team}</p>
        </div>
        <p className="mt-1.5 text-sm leading-5 text-slate-400">{player.reason}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-white">{ptsDisplay} pts</p>
        <p className={`text-xs font-semibold ${player.vorp_delta >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
          {vorpDisplay} VORP
        </p>
      </div>
    </div>
  );
}

function ProGate() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Pro Feature</p>
      <p className="mt-3 text-lg font-semibold text-white">Waiver Wire Optimizer</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Waiver wire rankings require a Corvus Pro subscription. Upgrade to access VORP-ranked pickups for your roster.
      </p>
      <a
        className="mt-6 inline-flex items-center rounded-md bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
        href="/account"
      >
        Upgrade to Pro →
      </a>
    </div>
  );
}

function TokenExpiredState() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Waiver Wire</p>
      <p className="mt-3 text-lg font-semibold text-white">Yahoo session expired</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Reconnect your Yahoo account to restore your live waiver rankings.
      </p>
      <button
        className="mt-6 inline-flex items-center rounded-md bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
        disabled={loading}
        type="button"
        onClick={async () => {
          setError('');
          setLoading(true);
          try {
            await startYahooOAuth();
          } catch (err) {
            setError(err.message || 'Could not reconnect Yahoo. Try again.');
            setLoading(false);
          }
        }}
      >
        {loading ? 'Reconnecting...' : 'Reconnect Yahoo →'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function AuthGate() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Waiver Wire</p>
      <p className="mt-3 text-lg font-semibold text-white">Sign in to get waiver picks</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Connect your fantasy platform and sign in to receive VORP-ranked waiver recommendations for your roster.
      </p>
    </div>
  );
}

export default function WaiverWire() {
  const [session, setSession] = useState(undefined);
  const [week, setWeek] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proRequired, setProRequired] = useState(false);
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
    setProRequired(false);
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
      if (caught instanceof ApiError && caught.status === 402) {
        setProRequired(true);
      } else if (
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
      <div className="flex h-32 items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
      </div>
    );
  }

  if (!session) return <AuthGate />;
  if (proRequired) return <ProGate />;
  if (tokenExpired) return <TokenExpiredState />;

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
        <label className="text-xs font-semibold text-slate-400">
          Week (optional)
          <input
            className="mt-1 block w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
            max="18"
            min="1"
            placeholder="Current"
            type="number"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </label>

        <button
          className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950/30 border-t-amber-950"
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
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Top Pickups — Week {result.week}
              </p>
              {result.platform && (
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                  {PLATFORM_LABELS[result.platform] ?? result.platform}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{result.pool_size} players scanned</p>
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
