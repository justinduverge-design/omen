import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import PlatformConnections from '../components/platforms/PlatformConnections.jsx';
import { ApiError, apiFetch } from '../lib/api.js';
import { storeNextUrl } from '../lib/nextUrl.js';
import { supabase } from '../lib/supabase.js';

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--color-accent)' }}>
      {children}
    </p>
  );
}

function PrimaryButton({ children, onClick, disabled = false, loading = false }) {
  return (
    <button
      className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: 'var(--color-accent)', color: '#000' }}
      disabled={disabled || loading}
      type="button"
      onClick={onClick}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled = false, loading = false }) {
  return (
    <button
      className="inline-flex min-h-[44px] items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
      disabled={disabled || loading}
      type="button"
      onClick={onClick}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

// ── Subscription section ──────────────────────────────────────────────────────

function SubscriptionSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-4 w-40 rounded-md" style={{ background: 'var(--color-surface-2)' }} />
      <div className="h-32 rounded-xl" style={{ background: 'var(--color-surface-1)' }} />
    </div>
  );
}

function PlanCard({ title, price, period, description, highlight, onSelect, loading }) {
  return (
    <article
      className="flex flex-col gap-4 rounded-xl border p-5 transition-colors"
      style={{
        borderColor: highlight ? 'var(--color-accent)' : 'var(--color-border)',
        background: highlight ? 'var(--color-accent-muted)' : 'var(--color-surface-1)',
      }}
    >
      <div>
        {highlight && (
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)' }}
          >
            Most popular
          </p>
        )}
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {price}
          </span>
          {period && (
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              /{period}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      </div>
      <PrimaryButton loading={loading} onClick={onSelect}>
        {title === 'Monthly' ? 'Start Free Trial' : 'Get Season Pass'}
      </PrimaryButton>
    </article>
  );
}

function ActiveSubscription({ subscription, onManage, manageLoading }) {
  const isTrial = subscription?.status === 'trialing';
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;
  const trialEnd = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;
  const planLabel = subscription?.plan === 'season' ? 'Season Pass' : 'Monthly';

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--color-risk-low)' }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--color-risk-low)' }}
              />
              {isTrial ? 'Trial active' : 'Active'}
            </span>
          </div>
          <h3
            className="mt-2 text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Corvus Pro — {planLabel}
          </h3>
          {isTrial && trialEnd && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Free trial ends {trialEnd}
            </p>
          )}
          {!isTrial && renewalDate && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {subscription?.plan === 'season' ? 'Expires' : 'Renews'} {renewalDate}
            </p>
          )}
        </div>
        {subscription?.can_manage_billing !== false && (
          <GhostButton loading={manageLoading} onClick={onManage}>
            Manage Subscription
          </GhostButton>
        )}
      </div>
    </div>
  );
}

function SubscriptionSection({ subscriptionRef, highlightUpgrade }) {
  const [summary, setSummary] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // 'monthly' | 'season' | null
  const [manageLoading, setManageLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [stripePrices, setStripePrices] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const subscribed = searchParams.get('subscribed');
    const cancelled = searchParams.get('cancelled');
    if (subscribed === 'true') {
      setSuccessBanner('You\'re now on Corvus Pro. Welcome aboard.');
      const next = new URLSearchParams(searchParams);
      next.delete('subscribed');
      setSearchParams(next, { replace: true });
    } else if (cancelled === 'true') {
      const next = new URLSearchParams(searchParams);
      next.delete('cancelled');
      setSearchParams(next, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/dashboard/summary')
      .then((data) => { if (mounted) setSummary(data); })
      .catch(() => { if (mounted) setFetchError(true); })
      .finally(() => { if (mounted) setLoadingState(false); });
    apiFetch('/api/stripe/prices')
      .then((data) => {
        if (mounted) {
          const byId = {};
          data.plans?.forEach((p) => { byId[p.id] = p.price?.display ?? null; });
          setStripePrices(byId);
        }
      })
      .catch(() => { /* silently ignore — fall back to hardcoded */ });
    return () => { mounted = false; };
  }, []);

  async function handleCheckout(plan) {
    setActionError('');
    setCheckoutLoading(plan);
    try {
      const { url } = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        body: { plan },
      });
      window.location.href = url;
    } catch (err) {
      setCheckoutLoading(null);
      setActionError(
        err instanceof ApiError && err.status === 503
          ? 'Upgrade is temporarily unavailable. Please try again later.'
          : (err.message || 'Could not start checkout. Try again.'),
      );
    }
  }

  async function handleManage() {
    setActionError('');
    setManageLoading(true);
    try {
      const { url } = await apiFetch('/api/stripe/portal', { method: 'POST' });
      window.location.href = url;
    } catch (err) {
      setManageLoading(false);
      if (err instanceof ApiError && err.status === 404) {
        setActionError('No billing record found. Please upgrade to create a subscription first.');
      } else {
        setActionError(err.message || 'Could not open billing portal. Try again.');
      }
    }
  }

  const sub = summary?.subscription;
  const isSubscribed = sub?.is_subscribed;

  function renderBody() {
    if (loadingState) return <SubscriptionSkeleton />;
    if (fetchError) {
      return (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Subscription status is temporarily unavailable.
        </p>
      );
    }
    if (isSubscribed) {
      return (
        <ActiveSubscription
          subscription={sub}
          manageLoading={manageLoading}
          onManage={handleManage}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
          Unlock Omen of the Week — your personalized weekly Most Valuable Play — with Corvus Pro.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            title="Monthly"
            price={stripePrices?.monthly ?? '$5'}
            period="mo"
            description="7-day free trial included. Cancel any time."
            highlight
            loading={checkoutLoading === 'monthly'}
            onSelect={() => handleCheckout('monthly')}
          />
          <PlanCard
            title="Season Pass"
            price={stripePrices?.season ?? '$20'}
            period={null}
            description="One payment for the full NFL season."
            highlight={false}
            loading={checkoutLoading === 'season'}
            onSelect={() => handleCheckout('season')}
          />
        </div>
      </div>
    );
  }

  return (
    <section ref={subscriptionRef} className="space-y-5">
      <div>
        <SectionLabel>Subscription</SectionLabel>
        <h2
          className="mt-2 text-2xl font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Corvus Pro
        </h2>
      </div>

      {successBanner && (
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: 'rgba(52,199,89,0.3)',
            background: 'rgba(52,199,89,0.08)',
          }}
          role="status"
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--color-risk-low)' }}>
            {successBanner}
          </p>
        </div>
      )}

      {highlightUpgrade && !isSubscribed && !loadingState && (
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: 'var(--color-accent)',
            background: 'var(--color-accent-muted)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
            Upgrade to access Omen of the Week
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Pick a plan below to unlock your weekly Most Valuable Play.
          </p>
        </div>
      )}

      {renderBody()}

      {actionError && (
        <p className="text-sm" style={{ color: 'var(--color-risk-high)' }} role="alert">
          {actionError}
        </p>
      )}
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Account() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recoveryState = searchParams.get('recovery') || null;
  const highlightUpgrade = searchParams.get('upgrade') === 'true';
  const [checkingSession, setCheckingSession] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (!data?.session) {
          storeNextUrl('/account');
          navigate('/login', { replace: true });
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (mounted) {
          storeNextUrl('/account');
          navigate('/login', { replace: true });
        }
      });
    return () => { mounted = false; };
  }, [navigate]);

  // Scroll to subscription section when ?upgrade=true
  useEffect(() => {
    if (!checkingSession && highlightUpgrade && subscriptionRef.current) {
      setTimeout(() => {
        subscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [checkingSession, highlightUpgrade]);

  if (checkingSession) {
    return (
      <AppLayout>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Checking account access…
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <section>
        <SectionLabel>Account</SectionLabel>
        <h1
          className="mt-3 font-serif text-4xl font-semibold sm:text-5xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Account
        </h1>
      </section>

      <SubscriptionSection
        subscriptionRef={subscriptionRef}
        highlightUpgrade={highlightUpgrade}
      />

      <section className="space-y-5">
        <div>
          <SectionLabel>Platforms</SectionLabel>
          <h2
            className="mt-2 text-2xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            League Connections
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
            Connect the fantasy platforms Corvus uses to read your rosters.
          </p>
        </div>
        <PlatformConnections recoveryState={recoveryState} />
      </section>
    </AppLayout>
  );
}
