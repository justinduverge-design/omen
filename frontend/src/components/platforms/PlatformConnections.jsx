import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api.js';
import { startYahooOAuth } from '../../lib/yahooAuth.js';

const EMPTY_STATUS = {
  yahoo: { connected: false, platform: 'yahoo' },
  sleeper: { connected: false, platform: 'sleeper', username: null },
  espn: { connected: false, platform: 'espn' },
};
const ESPN_ENABLED = import.meta.env.VITE_ESPN_ENABLED === 'true';

// User-facing recovery copy per ESPN state.
// Shown as a banner above the ESPN card when the user arrives from an Omen
// recovery CTA. Never place credential values, Vault ids, auth headers, or
// raw ESPN errors in these strings.
const ESPN_RECOVERY_COPY = {
  espn_reauth_required:
    'Your ESPN session has expired. Re-enter your cookies below to reconnect.',
  espn_league_context_missing:
    'Corvus needs your ESPN league ID. Enter it below to continue.',
  espn_import_blocked:
    'Your ESPN league may be private or the season may be inactive. Try refreshing your credentials below.',
  espn_recovery_needed:
    'Corvus lost access to your ESPN data. Reconnect below to continue.',
};

function errorMessage(error) {
  if (error instanceof ApiError) return error.message;
  return error?.message || 'Something went wrong. Try again.';
}

function ConnectedBadge() {
  return (
    <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
      Connected
    </span>
  );
}

function Field({ id, label, value, onChange, autoComplete = 'off', type = 'text' }) {
  return (
    <label className="block text-sm" style={{ color: 'var(--color-text-primary)' }} htmlFor={id}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <input
        id={id}
        autoComplete={autoComplete}
        className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
        style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
        type={type}
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Card({ title, description, connected, children }) {
  return (
    <article className="rounded-lg p-6" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
        </div>
        {connected ? <ConnectedBadge /> : null}
      </div>
      {children}
    </article>
  );
}

function EspnCookieInstructions() {
  return (
    <section className="rounded-lg p-4 text-sm leading-6" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>How to find your ESPN cookies</h3>

      <p className="mt-3">
        You need two cookies from ESPN&apos;s website: espn_s2 and SWID.
      </p>

      <div className="mt-4">
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Chrome or Edge:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Go to espn.com and make sure you&apos;re signed in.</li>
          <li>Press F12 to open DevTools.</li>
          <li>Click the Application tab.</li>
          <li>In the left sidebar, expand Cookies and click https://www.espn.com.</li>
          <li>Find the row named espn_s2. Copy the full value from the Value column.</li>
          <li>
            Find the row named SWID. Copy the full value — it looks like{' '}
            {'{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}'} including the curly braces.
          </li>
        </ol>
      </div>

      <div className="mt-4">
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Firefox:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Go to espn.com and make sure you&apos;re signed in.</li>
          <li>Press F12 to open DevTools.</li>
          <li>Click the Storage tab.</li>
          <li>Expand Cookies in the left sidebar and click https://www.espn.com.</li>
          <li>Find espn_s2 and copy its value.</li>
          <li>Find SWID and copy its value including the curly braces.</li>
        </ol>
      </div>

      <div className="mt-4">
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Safari:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>In Safari, go to Settings → Advanced and enable &quot;Show features for web developers.&quot;</li>
          <li>Go to espn.com and make sure you&apos;re signed in.</li>
          <li>Click Develop → Show Web Inspector (or press Option+Cmd+I).</li>
          <li>Click the Storage tab, then Cookies, then espn.com.</li>
          <li>Find espn_s2 and SWID and copy their values.</li>
        </ol>
      </div>

      <p className="mt-4">
        These cookies expire when you sign out of ESPN or after a long period of inactivity.
        If Corvus loses access to your ESPN data, return here and paste fresh values.
      </p>

      <p className="mt-3" style={{ color: 'var(--color-text-secondary)' }}>
        Your credentials are encrypted and stored securely. Disconnect at any time to remove
        Corvus&apos;s access to your ESPN account.
      </p>
    </section>
  );
}

export default function PlatformConnections({ recoveryState = null }) {
  // Show ESPN card when feature-flagged on OR when arriving via an ESPN recovery CTA.
  const espnRecovery = Boolean(recoveryState?.startsWith('espn_'));
  const showEspnCard = ESPN_ENABLED || espnRecovery;

  const [status, setStatus] = useState(EMPTY_STATUS);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [action, setAction] = useState(null);
  const [errors, setErrors] = useState({});
  const [sleeperForm, setSleeperForm] = useState({ username: '', league_id: '' });
  const [espnForm, setEspnForm] = useState({ espn_s2: '', swid: '', league_id: '' });
  // showEspnReconnectForm: true when the user clicks "Reconnect ESPN" while already connected.
  const [showEspnReconnectForm, setShowEspnReconnectForm] = useState(false);
  // espnConnectSucceeded: true after a successful ESPN connect during a recovery flow.
  const [espnConnectSucceeded, setEspnConnectSucceeded] = useState(false);

  async function refreshStatus() {
    setLoadingStatus(true);
    try {
      const nextStatus = await apiFetch('/api/platforms');
      setStatus({
        yahoo: nextStatus?.yahoo || EMPTY_STATUS.yahoo,
        sleeper: nextStatus?.sleeper || EMPTY_STATUS.sleeper,
        espn: nextStatus?.espn || EMPTY_STATUS.espn,
      });
      setErrors((current) => ({ ...current, status: null }));
    } catch (error) {
      setErrors((current) => ({ ...current, status: errorMessage(error) }));
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function disconnect(platform) {
    setAction(`disconnect-${platform}`);
    setErrors((current) => ({ ...current, [platform]: null }));
    try {
      await apiFetch(`/api/platforms/${platform}`, { method: 'DELETE' });
      await refreshStatus();
    } catch (error) {
      setErrors((current) => ({ ...current, [platform]: errorMessage(error) }));
    } finally {
      setAction(null);
    }
  }

  async function connectSleeper(event) {
    event.preventDefault();
    setAction('sleeper');
    setErrors((current) => ({ ...current, sleeper: null }));
    try {
      await apiFetch('/api/platforms/sleeper/connect', {
        method: 'POST',
        body: sleeperForm,
      });
      setSleeperForm({ username: '', league_id: '' });
      await refreshStatus();
    } catch (error) {
      setErrors((current) => ({ ...current, sleeper: errorMessage(error) }));
    } finally {
      setAction(null);
    }
  }

  async function connectYahoo() {
    setAction('yahoo');
    setErrors((current) => ({ ...current, yahoo: null }));
    try {
      await startYahooOAuth();
    } catch (error) {
      setErrors((current) => ({ ...current, yahoo: errorMessage(error) }));
      setAction(null);
    }
  }

  async function connectEspn(event) {
    event.preventDefault();
    setAction('espn');
    setErrors((current) => ({ ...current, espn: null }));
    try {
      await apiFetch('/api/platforms/espn/connect', {
        method: 'POST',
        body: espnForm,
      });
      setEspnForm({ espn_s2: '', swid: '', league_id: '' });
      setShowEspnReconnectForm(false);
      await refreshStatus();
      // When arriving from an Omen recovery CTA, flag success so we can offer
      // a "Return to Omen" link instead of just the disconnect button.
      if (espnRecovery) setEspnConnectSucceeded(true);
    } catch (error) {
      setErrors((current) => ({ ...current, espn: errorMessage(error) }));
    } finally {
      setAction(null);
    }
  }

  const disabled = loadingStatus || Boolean(action);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {errors.status ? (
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200 lg:col-span-3">
          {errors.status}
        </div>
      ) : null}

      <Card
        title="Yahoo"
        description="Connect through Yahoo OAuth."
        connected={status.yahoo.connected}
      >
        {loadingStatus ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading connection...</p>
        ) : status.yahoo.connected ? (
          <div className="space-y-3">
            <button
              className="rounded-md px-4 py-2 text-sm font-semibold transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={disabled}
              type="button"
              onClick={() => disconnect('yahoo')}
            >
              {action === 'disconnect-yahoo' ? 'Disconnecting...' : 'Disconnect'}
            </button>
            {errors.yahoo ? <p className="text-sm text-red-300">{errors.yahoo}</p> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300"
              disabled={disabled}
              type="button"
              onClick={connectYahoo}
            >
              {action === 'yahoo' ? 'Connecting...' : 'Connect Yahoo'}
            </button>
            {errors.yahoo ? <p className="text-sm text-red-300">{errors.yahoo}</p> : null}
          </div>
        )}
      </Card>

      <Card
        title="Sleeper"
        description="Connect with your public Sleeper username."
        connected={status.sleeper.connected}
      >
        {loadingStatus ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading connection...</p>
        ) : status.sleeper.connected ? (
          <div className="space-y-3">
            {status.sleeper.username ? (
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Username: {status.sleeper.username}</p>
            ) : null}
            <button
              className="rounded-md px-4 py-2 text-sm font-semibold transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={disabled}
              type="button"
              onClick={() => disconnect('sleeper')}
            >
              {action === 'disconnect-sleeper' ? 'Disconnecting...' : 'Disconnect'}
            </button>
            {errors.sleeper ? <p className="text-sm text-red-300">{errors.sleeper}</p> : null}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={connectSleeper}>
            <Field
              id="sleeper-username"
              label="Sleeper Username"
              value={sleeperForm.username}
              onChange={(username) => setSleeperForm((current) => ({ ...current, username }))}
            />
            <Field
              id="sleeper-league-id"
              label="League ID"
              value={sleeperForm.league_id}
              onChange={(league_id) => setSleeperForm((current) => ({ ...current, league_id }))}
            />
            <button
              className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              type="submit"
            >
              {action === 'sleeper' ? 'Connecting...' : 'Connect Sleeper'}
            </button>
            {errors.sleeper ? <p className="text-sm text-red-300">{errors.sleeper}</p> : null}
          </form>
        )}
      </Card>

      {showEspnCard && (
        <Card
          title="ESPN"
          description="Connect your ESPN Fantasy account. You'll need two values from your ESPN browser — step-by-step instructions are shown below."
          connected={status.espn.connected}
        >
          {/* Recovery context banner — shown when arriving from an Omen ESPN CTA */}
          {espnRecovery && ESPN_RECOVERY_COPY[recoveryState] ? (
            <div className="mb-4 rounded-md px-4 py-3 text-sm text-amber-200" style={{ borderColor: 'var(--color-accent)', border: '1px solid var(--color-accent)', background: 'var(--color-accent-muted)' }}>
              {ESPN_RECOVERY_COPY[recoveryState]}
            </div>
          ) : null}

          {loadingStatus ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading connection...</p>
          ) : espnConnectSucceeded ? (
            /* Recovery success: ESPN reconnected — offer return to Omen */
            <div className="space-y-3">
              <p className="text-sm text-emerald-300">ESPN reconnected successfully.</p>
              <a
                className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300"
                href="/football"
              >
                Return to Omen →
              </a>
            </div>
          ) : status.espn.connected && !showEspnReconnectForm ? (
            /* Connected — show disconnect, plus Reconnect button for expired-session state */
            <div className="space-y-3">
              {recoveryState === 'espn_reauth_required' ? (
                <button
                  className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled}
                  type="button"
                  onClick={() => setShowEspnReconnectForm(true)}
                >
                  Reconnect ESPN
                </button>
              ) : null}
              <button
                className="rounded-md px-4 py-2 text-sm font-semibold transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                disabled={disabled}
                type="button"
                onClick={() => disconnect('espn')}
              >
                {action === 'disconnect-espn' ? 'Disconnecting...' : 'Disconnect'}
              </button>
              {errors.espn ? <p className="text-sm text-red-300">{errors.espn}</p> : null}
            </div>
          ) : (
            /* Not connected, or reconnecting after reauth recovery */
            <form className="space-y-4" onSubmit={connectEspn}>
              <Field
                id="espn-s2"
                label="espn_s2 Cookie"
                type="password"
                value={espnForm.espn_s2}
                autoComplete="off"
                onChange={(espn_s2) => setEspnForm((current) => ({ ...current, espn_s2 }))}
              />
              <Field
                id="espn-swid"
                label="SWID Cookie"
                type="password"
                value={espnForm.swid}
                autoComplete="off"
                onChange={(swid) => setEspnForm((current) => ({ ...current, swid }))}
              />
              <Field
                id="espn-league-id"
                label="ESPN League ID"
                value={espnForm.league_id}
                onChange={(league_id) => setEspnForm((current) => ({ ...current, league_id }))}
              />
              <EspnCookieInstructions />
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled}
                  type="submit"
                >
                  {action === 'espn'
                    ? 'Connecting...'
                    : showEspnReconnectForm
                      ? 'Reconnect ESPN'
                      : 'Connect ESPN'}
                </button>
                {showEspnReconnectForm ? (
                  <button
                    className="rounded-md px-4 py-2 text-sm font-semibold transition-colors hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    disabled={disabled}
                    type="button"
                    onClick={() => {
                      setShowEspnReconnectForm(false);
                      setEspnForm({ espn_s2: '', swid: '', league_id: '' });
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              {errors.espn ? <p className="text-sm text-red-300">{errors.espn}</p> : null}
            </form>
          )}
        </Card>
      )}
    </section>
  );
}
