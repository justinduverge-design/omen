import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api.js';
import { platformButtonStyle } from '../../lib/platformChip.js';
import {
  startYahooOAuth,
  YAHOO_CONNECTIONS_ENABLED,
  YAHOO_UNAVAILABLE_MESSAGE,
} from '../../lib/yahooAuth.js';

const EMPTY_STATUS = {
  yahoo: { connected: false, platform: 'yahoo' },
  sleeper: { connected: false, platform: 'sleeper', username: null },
  espn: { connected: false, platform: 'espn' },
};
const ESPN_ENABLED = import.meta.env.VITE_ESPN_ENABLED === 'true';
const APP_STORE_BUILD = import.meta.env.VITE_APP_STORE_BUILD === 'true';

const ESPN_RECOVERY_COPY = {
  espn_reauth_required:
    'Your ESPN session has expired. Re-enter your cookies below to reconnect.',
  espn_league_context_missing:
    'Omen needs your ESPN league ID. Enter it below to continue.',
  espn_import_blocked:
    'Your ESPN league may be private or the season may be inactive. Try refreshing your credentials below.',
  espn_recovery_needed:
    'Omen lost access to your ESPN data. Reconnect below to continue.',
};

function errorMessage(error) {
  if (error instanceof ApiError) return error.message;
  return error?.message || 'Something went wrong. Try again.';
}

function ConnectedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
      Connected
    </span>
  );
}

function Field({ id, label, value, onChange, autoComplete = 'off', type = 'text' }) {
  return (
    <label className="block" htmlFor={id}>
      <span
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </span>
      <input
        id={id}
        autoComplete={autoComplete}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-1)',
          color: 'var(--color-text-primary)',
        }}
        type={type}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function EspnCookieInstructions() {
  return (
    <section
      className="rounded-lg p-4 text-sm leading-6"
      style={{
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface-1)',
        color: 'var(--color-text-primary)',
      }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        How to find your ESPN cookies
      </h3>

      <p className="mt-3">You need two cookies from ESPN&apos;s website: espn_s2 and SWID.</p>

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
        If Omen loses access to your ESPN data, return here and paste fresh values.
      </p>

      <p className="mt-3" style={{ color: 'var(--color-text-secondary)' }}>
        Your credentials are encrypted and stored securely. Disconnect at any time to remove
        Omen&apos;s access to your ESPN account.
      </p>
    </section>
  );
}

// ── Shared button style helpers ───────────────────────────────────────────────

function AccentButton({ children, disabled, onClick, type = 'button', as: Tag = 'button', href, platform = null }) {
  const base =
    'inline-flex min-h-[36px] items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50' +
    (platform ? ' hover:brightness-110' : '');
  const restingStyle = platform
    ? platformButtonStyle(platform)
    : { background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' };
  const props = {
    className: base,
    style: restingStyle,
    onMouseEnter: (e) => { if (!platform) e.currentTarget.style.background = 'var(--color-accent-hover)'; },
    onMouseLeave: (e) => { if (!platform) e.currentTarget.style.background = restingStyle.background; },
  };

  if (Tag === 'a') return <a href={href} {...props}>{children}</a>;
  return <button type={type} disabled={disabled} onClick={onClick} {...props}>{children}</button>;
}

function GhostButton({ children, disabled, onClick, danger = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-[36px] items-center rounded-lg border px-4 py-2 text-xs font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: 'var(--color-border)',
        color: danger ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (danger) {
          e.currentTarget.style.color = '#ef4444';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)';
        } else {
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.borderColor = 'var(--color-surface-3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = danger ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      {children}
    </button>
  );
}

// ── Inline form panel (appears below the row) ─────────────────────────────────

function FormPanel({ children }) {
  return (
    <div
      className="space-y-4 border-t px-5 py-5"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
    >
      {children}
    </div>
  );
}

// ── Row skeleton while status loads ──────────────────────────────────────────

function StatusSkeleton() {
  return (
    <div
      className="h-5 w-24 animate-pulse rounded-full motion-reduce:animate-none"
      style={{ background: 'var(--color-surface-3)' }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlatformConnections({ recoveryState = null }) {
  const espnRecovery = Boolean(recoveryState?.startsWith('espn_'));
  const showEspnRow = !APP_STORE_BUILD && (ESPN_ENABLED || espnRecovery);

  const [status, setStatus] = useState(EMPTY_STATUS);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [action, setAction] = useState(null);
  const [errors, setErrors] = useState({});

  // Which platform's form is open — only one at a time
  const [activeForm, setActiveForm] = useState(!APP_STORE_BUILD && espnRecovery ? 'espn' : null);

  // Sleeper guided flow
  const [sleeperUsername, setSleeperUsername] = useState('');
  const [sleeperStep, setSleeperStep] = useState('idle'); // idle | resolving | selecting | connecting
  const [sleeperResolvedData, setSleeperResolvedData] = useState(null);
  const [sleeperSelectedLeagueId, setSleeperSelectedLeagueId] = useState('');

  // ESPN form
  const [espnForm, setEspnForm] = useState({ espn_s2: '', swid: '', league_id: '' });
  const [espnConnectSucceeded, setEspnConnectSucceeded] = useState(false);

  async function refreshStatus() {
    setLoadingStatus(true);
    try {
      const next = await apiFetch('/api/platforms');
      setStatus({
        yahoo: next?.yahoo || EMPTY_STATUS.yahoo,
        sleeper: next?.sleeper || EMPTY_STATUS.sleeper,
        espn: next?.espn || EMPTY_STATUS.espn,
      });
      setErrors((c) => ({ ...c, status: null }));
    } catch (error) {
      setErrors((c) => ({ ...c, status: errorMessage(error) }));
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => { refreshStatus(); }, []);

  async function connectYahoo() {
    setAction('connect-yahoo');
    setErrors((c) => ({ ...c, yahoo: null }));
    try {
      await startYahooOAuth();
    } catch (error) {
      setErrors((c) => ({ ...c, yahoo: errorMessage(error) }));
      setAction(null);
    }
  }

  async function disconnect(platform) {
    setAction(`disconnect-${platform}`);
    setErrors((c) => ({ ...c, [platform]: null }));
    try {
      await apiFetch(`/api/platforms/${platform}`, { method: 'DELETE' });
      await refreshStatus();
    } catch (error) {
      setErrors((c) => ({ ...c, [platform]: errorMessage(error) }));
    } finally {
      setAction(null);
    }
  }

  async function resolveSleeper(e) {
    e.preventDefault();
    setErrors((c) => ({ ...c, sleeper: null }));
    setSleeperStep('resolving');
    try {
      const data = await apiFetch('/api/platforms/sleeper/resolve', {
        method: 'POST',
        body: { sleeper_username: sleeperUsername, season: new Date().getFullYear() },
      });
      setSleeperResolvedData(data);
      setSleeperSelectedLeagueId(data.leagues?.[0]?.id || '');
      setSleeperStep('selecting');
    } catch (error) {
      setErrors((c) => ({ ...c, sleeper: errorMessage(error) }));
      setSleeperStep('idle');
    }
  }

  async function connectSleeperLeague() {
    if (!sleeperSelectedLeagueId) return;
    setErrors((c) => ({ ...c, sleeper: null }));
    setSleeperStep('connecting');
    try {
      await apiFetch('/api/platforms/sleeper/connect', {
        method: 'POST',
        body: { sleeper_username: sleeperUsername, league_id: sleeperSelectedLeagueId },
      });
      setSleeperUsername('');
      setSleeperResolvedData(null);
      setSleeperStep('idle');
      setActiveForm(null);
      await refreshStatus();
    } catch (error) {
      setErrors((c) => ({ ...c, sleeper: errorMessage(error) }));
      setSleeperStep('selecting');
    }
  }

  async function connectEspn(e) {
    e.preventDefault();
    setAction('espn');
    setErrors((c) => ({ ...c, espn: null }));
    try {
      await apiFetch('/api/platforms/espn/connect', { method: 'POST', body: espnForm });
      setEspnForm({ espn_s2: '', swid: '', league_id: '' });
      await refreshStatus();
      if (espnRecovery) {
        setEspnConnectSucceeded(true);
      } else {
        setActiveForm(null);
      }
    } catch (error) {
      setErrors((c) => ({ ...c, espn: errorMessage(error) }));
    } finally {
      setAction(null);
    }
  }

  const disabled = loadingStatus || Boolean(action);

  function toggleForm(platform) {
    setActiveForm((prev) => (prev === platform ? null : platform));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section>
      {errors.status && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {errors.status}
        </div>
      )}

      <ul
        className="overflow-hidden rounded-xl"
        style={{ border: '1px solid var(--color-border)' }}
      >

        {/* ── Yahoo ──────────────────────────────────────────────────────── */}
        <li style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex min-h-[64px] items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Yahoo
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {!YAHOO_CONNECTIONS_ENABLED
                  ? YAHOO_UNAVAILABLE_MESSAGE
                  : status.yahoo.connected
                    ? 'Signed in via Yahoo OAuth.'
                    : 'Connect through Yahoo OAuth.'}
              </p>
            </div>

            {loadingStatus ? (
              <StatusSkeleton />
            ) : status.yahoo.connected ? (
              // An existing connection stays disconnectable even while Yahoo is
              // paused — otherwise a user who connected before the pause is stuck
              // with a row they cannot act on.
              <div className="flex shrink-0 items-center gap-3">
                <ConnectedBadge />
                <GhostButton
                  danger
                  disabled={disabled}
                  onClick={() => disconnect('yahoo')}
                >
                  {action === 'disconnect-yahoo' ? 'Disconnecting…' : 'Disconnect'}
                </GhostButton>
              </div>
            ) : !YAHOO_CONNECTIONS_ENABLED ? (
              <span
                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                On hold
              </span>
            ) : (
              <AccentButton platform="yahoo" disabled={disabled} onClick={connectYahoo}>
                {action === 'connect-yahoo' ? 'Connecting…' : 'Connect Yahoo'}
              </AccentButton>
            )}
          </div>
          {errors.yahoo && (
            <p className="px-5 pb-4 text-xs text-red-300" role="alert">{errors.yahoo}</p>
          )}
        </li>

        {/* ── Sleeper ────────────────────────────────────────────────────── */}
        <li style={{ borderBottom: showEspnRow ? '1px solid var(--color-border)' : undefined }}>
          <div className="flex min-h-[64px] items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Sleeper
              </p>
              <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {status.sleeper.connected && status.sleeper.username
                  ? `@${status.sleeper.username}`
                  : 'Enter your username — Omen finds your leagues.'}
              </p>
            </div>

            {loadingStatus ? (
              <StatusSkeleton />
            ) : status.sleeper.connected ? (
              <div className="flex shrink-0 items-center gap-3">
                <ConnectedBadge />
                <GhostButton
                  disabled={disabled}
                  onClick={() => {
                    setSleeperStep('idle');
                    setSleeperResolvedData(null);
                    toggleForm('sleeper');
                  }}
                >
                  {activeForm === 'sleeper' ? 'Cancel' : 'Switch league'}
                </GhostButton>
                {activeForm !== 'sleeper' && (
                  <GhostButton
                    danger
                    disabled={disabled}
                    onClick={() => disconnect('sleeper')}
                  >
                    {action === 'disconnect-sleeper' ? 'Disconnecting…' : 'Disconnect'}
                  </GhostButton>
                )}
              </div>
            ) : (
              <AccentButton platform="sleeper" disabled={disabled} onClick={() => toggleForm('sleeper')}>
                {activeForm === 'sleeper' ? 'Cancel' : 'Connect Sleeper'}
              </AccentButton>
            )}
          </div>

          {/* Sleeper form — expands inline */}
          {activeForm === 'sleeper' && (
            <FormPanel>
              {sleeperStep === 'idle' || sleeperStep === 'resolving' ? (
                <form className="space-y-4" onSubmit={resolveSleeper}>
                  <Field
                    id="sleeper-username-pc"
                    label="Sleeper Username"
                    value={sleeperUsername}
                    onChange={setSleeperUsername}
                  />
                  <AccentButton
                    platform="sleeper"
                    type="submit"
                    disabled={loadingStatus || sleeperStep === 'resolving' || !sleeperUsername.trim()}
                  >
                    {sleeperStep === 'resolving' ? 'Looking up leagues…' : 'Find My Leagues'}
                  </AccentButton>
                  {errors.sleeper && (
                    <p className="text-xs text-red-300" role="alert">{errors.sleeper}</p>
                  )}
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Found{' '}
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {sleeperResolvedData?.leagues?.length || 0}
                    </span>{' '}
                    league{sleeperResolvedData?.leagues?.length !== 1 ? 's' : ''} for{' '}
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {sleeperResolvedData?.username}
                    </span>.
                  </p>

                  {sleeperResolvedData?.leagues?.length > 0 ? (
                    <fieldset className="flex flex-col gap-2">
                      <legend className="sr-only">Select a league</legend>
                      {sleeperResolvedData.leagues.map((league) => (
                        <label
                          key={league.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors duration-150"
                          style={
                            sleeperSelectedLeagueId === league.id
                              ? {
                                  borderColor: 'var(--color-accent)',
                                  background: 'var(--color-accent-muted)',
                                }
                              : {
                                  borderColor: 'var(--color-border)',
                                  background: 'var(--color-surface-1)',
                                }
                          }
                        >
                          <input
                            checked={sleeperSelectedLeagueId === league.id}
                            className="sr-only"
                            name="sleeper-league-pc"
                            type="radio"
                            value={league.id}
                            onChange={() => setSleeperSelectedLeagueId(league.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-sm font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {league.name || `League ${league.id}`}
                            </p>
                            {league.scoring_format && (
                              <p
                                className="text-[10px] uppercase tracking-wider"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                {league.scoring_format}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      No active leagues found for this season.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <AccentButton
                      platform="sleeper"
                      disabled={!sleeperSelectedLeagueId || sleeperStep === 'connecting'}
                      onClick={connectSleeperLeague}
                    >
                      {sleeperStep === 'connecting'
                        ? 'Connecting…'
                        : status.sleeper.connected
                        ? 'Switch to This League'
                        : 'Connect League'}
                    </AccentButton>
                    <GhostButton
                      disabled={sleeperStep === 'connecting'}
                      onClick={() => { setSleeperStep('idle'); setSleeperResolvedData(null); }}
                    >
                      Change Username
                    </GhostButton>
                  </div>

                  {errors.sleeper && (
                    <p className="text-xs text-red-300" role="alert">{errors.sleeper}</p>
                  )}
                </div>
              )}
            </FormPanel>
          )}

          {errors.sleeper && activeForm !== 'sleeper' && (
            <p className="px-5 pb-4 text-xs text-red-300" role="alert">{errors.sleeper}</p>
          )}
        </li>

        {/* ── ESPN ───────────────────────────────────────────────────────── */}
        {showEspnRow && (
          <li>
            <div className="flex min-h-[64px] items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  ESPN
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {status.espn.connected
                    ? 'Connected via ESPN cookies.'
                    : 'Connect via browser cookies.'}
                </p>
              </div>

              {loadingStatus ? (
                <StatusSkeleton />
              ) : espnConnectSucceeded ? (
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-emerald-300">Reconnected</span>
                  <AccentButton as="a" href="/football">
                    Return to Omen →
                  </AccentButton>
                </div>
              ) : status.espn.connected ? (
                <div className="flex shrink-0 items-center gap-3">
                  <ConnectedBadge />
                  <GhostButton
                    disabled={disabled}
                    onClick={() => toggleForm('espn')}
                  >
                    {activeForm === 'espn' ? 'Cancel' : 'Reconnect'}
                  </GhostButton>
                  {activeForm !== 'espn' && (
                    <GhostButton
                      danger
                      disabled={disabled}
                      onClick={() => disconnect('espn')}
                    >
                      {action === 'disconnect-espn' ? 'Disconnecting…' : 'Disconnect'}
                    </GhostButton>
                  )}
                </div>
              ) : (
                <AccentButton platform="espn" disabled={disabled} onClick={() => toggleForm('espn')}>
                  {activeForm === 'espn' ? 'Cancel' : 'Connect ESPN'}
                </AccentButton>
              )}
            </div>

            {/* ESPN form — expands inline */}
            {activeForm === 'espn' && !espnConnectSucceeded && (
              <FormPanel>
                {espnRecovery && ESPN_RECOVERY_COPY[recoveryState] && (
                  <div
                    className="rounded-lg px-4 py-3 text-sm text-amber-200"
                    style={{
                      border: '1px solid var(--color-accent)',
                      background: 'var(--color-accent-muted)',
                    }}
                  >
                    {ESPN_RECOVERY_COPY[recoveryState]}
                  </div>
                )}

                <form className="space-y-4" onSubmit={connectEspn}>
                  <EspnCookieInstructions />
                  <Field
                    id="espn-s2"
                    label="espn_s2 Cookie"
                    type="password"
                    value={espnForm.espn_s2}
                    autoComplete="off"
                    onChange={(espn_s2) => setEspnForm((c) => ({ ...c, espn_s2 }))}
                  />
                  <Field
                    id="espn-swid"
                    label="SWID Cookie"
                    type="password"
                    value={espnForm.swid}
                    autoComplete="off"
                    onChange={(swid) => setEspnForm((c) => ({ ...c, swid }))}
                  />
                  <Field
                    id="espn-league-id"
                    label="ESPN League ID"
                    value={espnForm.league_id}
                    onChange={(league_id) => setEspnForm((c) => ({ ...c, league_id }))}
                  />
                  <AccentButton platform="espn" type="submit" disabled={disabled}>
                    {action === 'espn'
                      ? 'Connecting…'
                      : status.espn.connected
                      ? 'Reconnect ESPN'
                      : 'Connect ESPN'}
                  </AccentButton>
                  {errors.espn && (
                    <p className="text-xs text-red-300" role="alert">{errors.espn}</p>
                  )}
                </form>
              </FormPanel>
            )}

            {errors.espn && activeForm !== 'espn' && (
              <p className="px-5 pb-4 text-xs text-red-300" role="alert">{errors.espn}</p>
            )}
          </li>
        )}
      </ul>
    </section>
  );
}
