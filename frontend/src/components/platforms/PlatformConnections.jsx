import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api.js';

const EMPTY_STATUS = {
  yahoo: { connected: false, platform: 'yahoo' },
  sleeper: { connected: false, platform: 'sleeper', username: null },
  espn: { connected: false, platform: 'espn' },
};
const ESPN_ENABLED = import.meta.env.VITE_ESPN_ENABLED === 'true';

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
    <label className="block text-sm text-slate-300" htmlFor={id}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        id={id}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400"
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
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        {connected ? <ConnectedBadge /> : null}
      </div>
      {children}
    </article>
  );
}

function EspnCookieInstructions() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
      <h3 className="text-sm font-semibold text-white">How to find your ESPN cookies</h3>

      <p className="mt-3">
        You need two cookies from ESPN&apos;s website: espn_s2 and SWID.
      </p>

      <div className="mt-4">
        <p className="font-semibold text-slate-200">Chrome or Edge:</p>
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
        <p className="font-semibold text-slate-200">Firefox:</p>
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
        <p className="font-semibold text-slate-200">Safari:</p>
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
    </section>
  );
}

export default function PlatformConnections() {
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [action, setAction] = useState(null);
  const [errors, setErrors] = useState({});
  const [sleeperForm, setSleeperForm] = useState({ username: '', league_id: '' });
  const [espnForm, setEspnForm] = useState({ espn_s2: '', swid: '', league_id: '' });

  async function refreshStatus() {
    setLoadingStatus(true);
    try {
      const nextStatus = await apiFetch('/api/platforms/status');
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
      await refreshStatus();
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
          <p className="text-sm text-slate-400">Loading connection...</p>
        ) : status.yahoo.connected ? (
          <div className="space-y-3">
            <button
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
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
              type="button"
              onClick={() => {
                window.location.href = '/api/yahoo/auth';
              }}
            >
              Connect Yahoo
            </button>
          </div>
        )}
      </Card>

      <Card
        title="Sleeper"
        description="Connect with your public Sleeper username."
        connected={status.sleeper.connected}
      >
        {loadingStatus ? (
          <p className="text-sm text-slate-400">Loading connection...</p>
        ) : status.sleeper.connected ? (
          <div className="space-y-3">
            {status.sleeper.username ? (
              <p className="text-sm text-slate-300">Username: {status.sleeper.username}</p>
            ) : null}
            <button
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
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

      {ESPN_ENABLED && (
        <Card
          title="ESPN"
          description="Connect your ESPN Fantasy account. You'll need two values from your ESPN browser — step-by-step instructions are shown below."
          connected={status.espn.connected}
        >
          {loadingStatus ? (
            <p className="text-sm text-slate-400">Loading connection...</p>
          ) : status.espn.connected ? (
            <div className="space-y-3">
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                type="button"
                onClick={() => disconnect('espn')}
              >
                {action === 'disconnect-espn' ? 'Disconnecting...' : 'Disconnect'}
              </button>
              {errors.espn ? <p className="text-sm text-red-300">{errors.espn}</p> : null}
            </div>
          ) : (
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
              <button
                className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                type="submit"
              >
                {action === 'espn' ? 'Connecting...' : 'Connect ESPN'}
              </button>
              {errors.espn ? <p className="text-sm text-red-300">{errors.espn}</p> : null}
            </form>
          )}
        </Card>
      )}
    </section>
  );
}
