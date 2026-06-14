import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { consumeNextUrl, storeNextUrl } from '../lib/nextUrl.js';
import { supabase } from '../lib/supabase.js';
import { startYahooOAuth } from '../lib/yahooAuth.js';

// ── Shared primitives ─────────────────────────────────────────────────────────

const PLATFORM_ICONS = {
  Sleeper:        { letter: 'S', bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  Yahoo:          { letter: 'Y', bg: 'rgba(147,51,234,0.15)', color: '#c084fc' },
  ESPN:           { letter: 'E', bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
  'Manual Entry': { letter: 'M', bg: 'rgba(100,116,139,0.15)', color: 'var(--color-text-secondary)' },
};

function PlatformIcon({ title }) {
  const s = PLATFORM_ICONS[title] ?? { letter: title[0], bg: 'var(--color-surface-2)', color: 'var(--color-accent)' };
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.letter}
    </span>
  );
}

function PlatformCard({ title, description, badge, children }) {
  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlatformIcon title={title} />
          <div>
            <h2 className="font-sans text-sm font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{description}</p>
          </div>
        </div>
        {badge}
      </div>
      {children}
    </article>
  );
}

function ConnectedBadge() {
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--color-risk-low)' }}
    >
      Connected
    </span>
  );
}

function CTAButton({ children, onClick, disabled = false, loading = false, type = 'button' }) {
  return (
    <button
      className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: 'var(--color-accent)', color: '#000' }}
      disabled={disabled || loading}
      aria-busy={loading}
      type={type}
      onClick={onClick}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled = false }) {
  return (
    <button
      className="inline-flex min-h-[44px] items-center justify-center rounded-lg border px-5 text-sm font-semibold transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FieldInput({ id, label, value, onChange, type = 'text', autoComplete = 'off', placeholder = '' }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        {label}
      </span>
      <input
        id={id}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none transition-colors focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
        placeholder={placeholder}
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ErrorMsg({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-400" role="alert">
      {message}
    </p>
  );
}

// ── Sleeper card — resolve → select → connect ─────────────────────────────────

function SleeperCard({ connected, connectedUsername, onRefresh, disabled }) {
  const [step, setStep] = useState('idle'); // idle | resolving | selecting | connecting | done
  const [username, setUsername] = useState('');
  const [resolvedData, setResolvedData] = useState(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [error, setError] = useState('');

  async function handleResolve(e) {
    e.preventDefault();
    setError('');
    setStep('resolving');
    try {
      const data = await apiFetch('/api/platforms/sleeper/resolve', {
        method: 'POST',
        body: { sleeper_username: username, season: new Date().getFullYear() },
      });
      setResolvedData(data);
      setSelectedLeagueId(data.leagues?.[0]?.id || '');
      setStep('selecting');
    } catch (err) {
      setError(err.message || 'Could not find that Sleeper username. Check the spelling and try again.');
      setStep('idle');
    }
  }

  async function handleConnect() {
    if (!selectedLeagueId) return;
    setError('');
    setStep('connecting');
    try {
      await apiFetch('/api/platforms/sleeper/connect', {
        method: 'POST',
        body: { sleeper_username: username, league_id: selectedLeagueId },
      });
      setStep('done');
      onRefresh();
    } catch (err) {
      setError(err.message || 'Could not connect that league. Try again.');
      setStep('selecting');
    }
  }

  async function handleDisconnect() {
    setError('');
    try {
      await apiFetch('/api/platforms/sleeper', { method: 'DELETE' });
      setStep('idle');
      setUsername('');
      setResolvedData(null);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (connected) {
    return (
      <PlatformCard
        title="Sleeper"
        description="Connected with your Sleeper account."
        badge={<ConnectedBadge />}
      >
        {connectedUsername && (
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Username: <span className="text-[var(--color-text-primary)]">{connectedUsername}</span>
          </p>
        )}
        <GhostButton disabled={disabled} onClick={handleDisconnect}>
          Disconnect
        </GhostButton>
        <ErrorMsg message={error} />
      </PlatformCard>
    );
  }

  return (
    <PlatformCard
      title="Sleeper"
      description="Enter your Sleeper username — no password needed."
    >
      {step === 'idle' && (
        <form className="flex flex-col gap-3" onSubmit={handleResolve}>
          <FieldInput
            id="sleeper-username"
            label="Sleeper Username"
            placeholder="yoursleeperusername"
            value={username}
            onChange={setUsername}
          />
          <CTAButton type="submit" loading={false} disabled={disabled || !username.trim()}>
            Find My Leagues
          </CTAButton>
          <ErrorMsg message={error} />
        </form>
      )}

      {step === 'resolving' && (
        <p className="text-xs text-[var(--color-text-secondary)]">Looking up your Sleeper leagues…</p>
      )}

      {step === 'selecting' && resolvedData && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Found <span className="text-[var(--color-text-primary)]">{resolvedData.leagues?.length || 0}</span> league
            {resolvedData.leagues?.length !== 1 ? 's' : ''} for{' '}
            <span className="text-[var(--color-text-primary)]">{resolvedData.username}</span>.
            Pick one to connect.
          </p>

          {resolvedData.leagues?.length > 0 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Select a league</legend>
              {resolvedData.leagues.map((league) => (
                <label
                  key={league.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selectedLeagueId === league.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border)]'
                  }`}
                >
                  <input
                    checked={selectedLeagueId === league.id}
                    className="sr-only"
                    name="sleeper-league"
                    type="radio"
                    value={league.id}
                    onChange={() => setSelectedLeagueId(league.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {league.name || `League ${league.id}`}
                    </p>
                    {league.scoring_format && (
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                        {league.scoring_format}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-xs text-[var(--color-text-secondary)]">
              No active leagues found for this season.
            </p>
          )}

          <div className="flex gap-2">
            <CTAButton
              disabled={!selectedLeagueId}
              loading={step === 'connecting'}
              onClick={handleConnect}
            >
              Connect League
            </CTAButton>
            <GhostButton onClick={() => { setStep('idle'); setResolvedData(null); }}>
              Change Username
            </GhostButton>
          </div>
          <ErrorMsg message={error} />
        </div>
      )}
    </PlatformCard>
  );
}

// ── Yahoo card ─────────────────────────────────────────────────────────────────

function YahooCard({ connected, disabled, onRefresh }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setError('');
    try {
      await apiFetch('/api/platforms/yahoo', { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (connected) {
    return (
      <PlatformCard
        title="Yahoo"
        description="Yahoo Fantasy is connected."
        badge={<ConnectedBadge />}
      >
        <GhostButton disabled={disabled} onClick={handleDisconnect}>
          Disconnect
        </GhostButton>
        <ErrorMsg message={error} />
      </PlatformCard>
    );
  }

  return (
    <PlatformCard
      title="Yahoo"
      description="Connect via Yahoo OAuth. You'll be redirected to Yahoo to authorize access."
    >
      <CTAButton
        disabled={disabled}
        loading={loading}
        onClick={async () => {
          setError('');
          setLoading(true);
          try {
            await startYahooOAuth();
          } catch (err) {
            setError(err.message || 'Could not start Yahoo connection. Try again.');
            setLoading(false);
          }
        }}
      >
        Connect Yahoo
      </CTAButton>
      <ErrorMsg message={error} />
    </PlatformCard>
  );
}

// ── ESPN card — guided step-by-step walkthrough ───────────────────────────────

const ESPN_STEPS = [
  {
    browser: 'Chrome or Edge',
    steps: [
      'Go to espn.com and sign in.',
      'Press F12 to open DevTools, then click the Application tab.',
      'In the left sidebar, expand Cookies → click https://www.espn.com.',
      'Find the row named espn_s2. Copy the full value.',
      'Find the row named SWID. Copy the full value — it starts and ends with curly braces.',
    ],
  },
  {
    browser: 'Firefox',
    steps: [
      'Go to espn.com and sign in.',
      'Press F12, then click the Storage tab.',
      'Expand Cookies → click https://www.espn.com.',
      'Find espn_s2 and SWID. Copy each value.',
    ],
  },
  {
    browser: 'Safari',
    steps: [
      'In Safari: Settings → Advanced → enable "Show features for web developers."',
      'Go to espn.com and sign in.',
      'Click Develop → Show Web Inspector (or Option+Cmd+I).',
      'Click Storage → Cookies → espn.com.',
      'Find espn_s2 and SWID. Copy each value.',
    ],
  },
];

function EspnGuide({ browser, setBrowser }) {
  const guide = ESPN_STEPS.find(g => g.browser === browser) || ESPN_STEPS[0];
  return (
    <div
      className="rounded-lg p-4 text-sm"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        How to find your ESPN cookies
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {ESPN_STEPS.map(g => (
          <button
            key={g.browser}
            aria-pressed={browser === g.browser}
            className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              browser === g.browser
                ? 'bg-[var(--color-accent)] text-black'
                : 'bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
            type="button"
            onClick={() => setBrowser(g.browser)}
          >
            {g.browser}
          </button>
        ))}
      </div>
      <ol className="list-decimal space-y-1.5 pl-4">
        {guide.steps.map((step, i) => (
          <li key={i} className="text-xs leading-5 text-[var(--color-text-secondary)]">{step}</li>
        ))}
      </ol>
      <p className="mt-3 text-[10px] text-[var(--color-text-tertiary)]">
        ESPN cookies expire when you sign out or after long inactivity. If Corvus loses access, return here with fresh values.
        Your credentials are encrypted and stored securely.
      </p>
    </div>
  );
}

function EspnCard({ connected, disabled, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [browser, setBrowser] = useState('Chrome or Edge');
  const [form, setForm] = useState({ espn_s2: '', swid: '', league_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ESPN_ENABLED = import.meta.env.VITE_ESPN_ENABLED === 'true';
  if (!ESPN_ENABLED && !connected) return null;

  async function handleConnect(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/platforms/espn/connect', {
        method: 'POST',
        body: form,
      });
      setForm({ espn_s2: '', swid: '', league_id: '' });
      setShowForm(false);
      onRefresh();
    } catch (err) {
      const code = err.body?.code;
      const messages = {
        espn_cookies_required: 'Please enter both espn_s2 and SWID cookies.',
        espn_league_id_required: 'Please enter your ESPN League ID.',
        espn_cookies_invalid: 'Those cookies were rejected by ESPN. Make sure you copied them correctly — they expire when you sign out.',
      };
      setError(messages[code] || err.message || 'Could not connect to ESPN. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setError('');
    try {
      await apiFetch('/api/platforms/espn', { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (connected && !showForm) {
    return (
      <PlatformCard
        title="ESPN"
        description="ESPN Fantasy is connected."
        badge={<ConnectedBadge />}
      >
        <div className="flex gap-2 flex-wrap">
          <GhostButton disabled={disabled} onClick={() => setShowForm(true)}>
            Reconnect ESPN
          </GhostButton>
          <GhostButton disabled={disabled} onClick={handleDisconnect}>
            Disconnect
          </GhostButton>
        </div>
        <ErrorMsg message={error} />
      </PlatformCard>
    );
  }

  return (
    <PlatformCard
      title="ESPN"
      description="Requires two cookies from your ESPN session. Every step is shown below — takes about 2 minutes."
      badge={connected ? <ConnectedBadge /> : undefined}
    >
      <div className="flex flex-col gap-4">
        <EspnGuide browser={browser} setBrowser={setBrowser} />

        <form className="flex flex-col gap-3" onSubmit={handleConnect}>
          <FieldInput
            id="espn-s2"
            label="espn_s2 Cookie"
            type="password"
            value={form.espn_s2}
            onChange={(v) => setForm(f => ({ ...f, espn_s2: v }))}
          />
          <FieldInput
            id="espn-swid"
            label="SWID Cookie"
            type="password"
            value={form.swid}
            onChange={(v) => setForm(f => ({ ...f, swid: v }))}
          />
          <FieldInput
            id="espn-league-id"
            label="ESPN League ID"
            placeholder="12345678"
            value={form.league_id}
            onChange={(v) => setForm(f => ({ ...f, league_id: v }))}
          />
          <div className="flex gap-2">
            <CTAButton loading={loading} type="submit" disabled={disabled}>
              {connected ? 'Reconnect ESPN' : 'Connect ESPN'}
            </CTAButton>
            {showForm && (
              <GhostButton onClick={() => { setShowForm(false); setError(''); }}>
                Cancel
              </GhostButton>
            )}
          </div>
          <ErrorMsg message={error} />
        </form>
      </div>
    </PlatformCard>
  );
}

// ── Manual entry card (locked pending audit) ──────────────────────────────────

function ManualCard() {
  return (
    <PlatformCard
      title="Manual Entry"
      description="Enter your league details without a platform connection."
    >
      <div
        className="rounded-lg px-4 py-3 text-xs"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="font-semibold text-[var(--color-text-secondary)]">Coming soon</p>
        <p className="mt-1 text-[var(--color-text-tertiary)]">
          Manual entry is under development. Connect Sleeper, Yahoo, or ESPN for full Omen access now.
        </p>
      </div>
    </PlatformCard>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ConnectLeague() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [platforms, setPlatforms] = useState(null);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  // Preserve ?next= into storage if passed directly
  useEffect(() => {
    const next = searchParams.get('next');
    if (next) storeNextUrl(next);
  }, [searchParams]);

  // Auth gate — redirect to login if not signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) {
        storeNextUrl('/account/connect');
        navigate('/login', { replace: true });
      } else {
        setCheckingAuth(false);
      }
    });
  }, [navigate]);

  async function fetchPlatforms() {
    setLoadingPlatforms(true);
    try {
      const data = await apiFetch('/api/platforms');
      setPlatforms(data?.platforms || null);
    } catch (_) {
      setPlatforms(null);
    } finally {
      setLoadingPlatforms(false);
    }
  }

  useEffect(() => {
    if (!checkingAuth) fetchPlatforms();
  }, [checkingAuth]);

  function handleSkip() {
    // Consume any stored ?next= and discard it — skip means go to dashboard
    consumeNextUrl();
    navigate('/football', { replace: true });
  }

  function handleContinue() {
    const dest = consumeNextUrl();
    navigate(dest, { replace: true });
  }

  const anyConnected = platforms
    ? ['sleeper', 'yahoo', 'espn'].some(p => platforms[p]?.connected)
    : false;

  if (checkingAuth) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">Checking your account…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] px-4 py-12"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
            Step 2 of 2
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Connect Your League
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            Corvus needs your league to find your Most Valuable Play.
            Connect the platform your league runs on.
          </p>
        </div>

        {/* Platform cards */}
        {loadingPlatforms ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-24 animate-pulse motion-reduce:animate-none rounded-xl"
                style={{ background: 'var(--color-surface-1)' }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <SleeperCard
              connected={platforms?.sleeper?.connected || false}
              connectedUsername={platforms?.sleeper?.username}
              disabled={loadingPlatforms}
              onRefresh={fetchPlatforms}
            />
            <YahooCard
              connected={platforms?.yahoo?.connected || false}
              disabled={loadingPlatforms}
              onRefresh={fetchPlatforms}
            />
            <EspnCard
              connected={platforms?.espn?.connected || false}
              disabled={loadingPlatforms}
              onRefresh={fetchPlatforms}
            />
            <ManualCard />
          </div>
        )}

        {/* Continue / Skip */}
        <div className="mt-8 flex flex-col gap-3">
          {anyConnected && (
            <button
              className="w-full min-h-[48px] rounded-lg text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              style={{ background: 'var(--color-accent)', color: '#000' }}
              type="button"
              onClick={handleContinue}
            >
              Continue →
            </button>
          )}

          <button
            className="w-full min-h-[44px] rounded-lg text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border)]"
            style={{ color: 'var(--color-text-tertiary)' }}
            type="button"
            onClick={handleSkip}
          >
            Skip for now — I'll connect later
          </button>
          <p className="text-center text-[10px] text-[var(--color-text-tertiary)]">
            Skipping keeps Trade Analyzer available. Omen requires a connected league.
          </p>
        </div>
      </div>
    </div>
  );
}
