import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import PlatformConnections from '../components/platforms/PlatformConnections.jsx';
import { apiFetch } from '../lib/api.js';
import { storeNextUrl } from '../lib/nextUrl.js';
import { supabase } from '../lib/supabase.js';

const PLAN_OPTIONS = [
  {
    id: 'monthly',
    label: 'Monthly',
    badge: '7-day trial',
    description: "Recurring subscription. Includes a 7-day free trial — cancel before it ends and you won't be charged.",
    cta: 'Start 7-day free trial',
  },
  {
    id: 'season',
    label: 'Season Pass',
    badge: 'One-time',
    description: 'Single payment for full-season access. No renewal, no surprises.',
    cta: 'Continue to checkout',
  },
];

async function fetchStripePrices() {
  try {
    const data = await apiFetch('/api/stripe/prices');
    const map = {};
    for (const plan of data?.plans ?? []) {
      if (plan.price?.display) map[plan.id] = plan.price.display;
    }
    return map;
  } catch {
    return {};
  }
}

// ── Banner ────────────────────────────────────────────────────────────────────

function SubscriptionBanner({ type, onDismiss }) {
  if (type === 'subscribed') {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-emerald-300">Welcome to Corvus Pro.</p>
          <p className="mt-0.5 text-xs text-emerald-200/70">Your subscription is active. You're all set.</p>
        </div>
        <button
          className="ml-4 shrink-0 text-xs text-emerald-400/50 transition-colors hover:text-emerald-300"
          type="button"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (type === 'cancelled') {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-5 py-3">
        <p className="text-sm text-[var(--color-text-secondary)]">Checkout cancelled — no changes were made.</p>
        <button
          className="ml-4 shrink-0 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
          type="button"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}

// ── Plan picker ───────────────────────────────────────────────────────────────

function PlanCard({ option, selected, onSelect, price }) {
  const isSelected = selected === option.id;
  return (
    <button
      role="radio"
      aria-checked={isSelected}
      className={[
        'w-full rounded-xl border p-4 text-left transition-colors',
        isSelected
          ? 'border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10'
          : 'border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-surface-3)]',
      ].join(' ')}
      type="button"
      onClick={() => onSelect(option.id)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <p className={`text-sm font-semibold ${isSelected ? 'text-[var(--color-accent-hover)]' : 'text-[var(--color-text-primary)]'}`}>
            {option.label}
          </p>
          {price && (
            <span className={`font-mono text-sm tabular-nums ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}>
              {price}
            </span>
          )}
        </div>
        <span
          className={[
            'rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0',
            isSelected
              ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]',
          ].join(' ')}
        >
          {option.badge}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{option.description}</p>
    </button>
  );
}

function PlanPicker({ onCheckout, loading, error }) {
  const [selected, setSelected] = useState('monthly');
  const [prices, setPrices] = useState({});
  const selectedOption = PLAN_OPTIONS.find((o) => o.id === selected);

  useEffect(() => {
    fetchStripePrices().then(setPrices);
  }, []);

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Select a plan" className="space-y-2">
        {PLAN_OPTIONS.map((opt) => (
          <PlanCard key={opt.id} option={opt} selected={selected} onSelect={setSelected} price={prices[opt.id]} />
        ))}
      </div>

      {error && <p className="text-xs text-red-400" role="alert">{error}</p>}

      <button
        className="w-full rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-60"
        disabled={loading}
        type="button"
        onClick={() => onCheckout(selected)}
      >
        {loading ? 'Redirecting to Stripe…' : selectedOption?.cta ?? 'Continue to checkout'}
      </button>

      <p className="text-center text-xs text-[var(--color-text-tertiary)]">
        Payments secured by Stripe.
      </p>
    </div>
  );
}

// ── Active state ──────────────────────────────────────────────────────────────

function ActiveSubscription({ subscription, onManage, loading, error }) {
  const planLabel = subscription?.plan === 'monthly'
    ? 'Monthly'
    : subscription?.plan === 'season'
    ? 'Season Pass'
    : null;

  const periodEnd = subscription?.current_period_end || subscription?.expires_at;
  let periodLabel = null;
  if (periodEnd) {
    const d = new Date(periodEnd);
    if (!Number.isNaN(d.getTime())) {
      periodLabel = d.toLocaleDateString(undefined, {
        month: 'long', day: 'numeric', year: 'numeric',
      });
    }
  }

  const renewsOrExpires = subscription?.plan === 'season' ? 'Access through' : 'Renews';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Corvus Pro · Active
        </span>
        {planLabel && <span className="text-xs text-[var(--color-text-secondary)]">{planLabel}</span>}
        {periodLabel && (
          <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">
            {renewsOrExpires} {periodLabel}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-400" role="alert">{error}</p>}

      {subscription?.can_manage_billing && (
        <button
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
          disabled={loading}
          type="button"
          onClick={onManage}
        >
          {loading ? 'Redirecting…' : 'Manage subscription'}
        </button>
      )}
    </div>
  );
}

// ── Subscription section ──────────────────────────────────────────────────────

function SubscriptionSection({ subscription, summaryLoading, summaryError, onRefetch, sectionRef }) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  async function handleCheckout(plan) {
    setCheckoutLoading(true);
    setActionError(null);
    try {
      const { url } = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        body: { plan },
      });
      window.location.href = url;
    } catch (err) {
      const status = err?.status;
      if (status === 503) {
        setActionError('Stripe is not available right now. Please try again later.');
      } else if (status === 400) {
        setActionError('Invalid plan selected. Please choose a plan and try again.');
      } else {
        setActionError('Could not open Stripe checkout. Please try again.');
      }
      setCheckoutLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setActionError(null);
    try {
      const { url } = await apiFetch('/api/stripe/portal', { method: 'POST' });
      window.location.href = url;
    } catch (err) {
      const status = err?.status;
      if (status === 404) {
        setActionError('No billing record found. Complete a checkout first.');
      } else if (status === 503) {
        setActionError('Billing portal is not available right now. Please try again later.');
      } else {
        setActionError('Could not open the billing portal. Please try again.');
      }
      setPortalLoading(false);
    }
  }

  function renderBody() {
    if (summaryLoading) {
      return (
        <div className="animate-pulse motion-reduce:animate-none space-y-3">
          <div className="h-14 rounded-xl bg-[var(--color-surface-2)]" />
          <div className="h-14 rounded-xl bg-[var(--color-surface-2)]" />
          <div className="h-11 w-full rounded-xl bg-[var(--color-surface-2)]" />
        </div>
      );
    }

    if (summaryError || subscription?.status === 'unknown') {
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <p className="text-sm text-[var(--color-text-secondary)]">Could not load subscription status.</p>
          <button
            className="mt-3 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
            type="button"
            onClick={onRefetch}
          >
            Retry →
          </button>
        </div>
      );
    }

    if (subscription?.is_subscribed) {
      return (
        <ActiveSubscription
          subscription={subscription}
          onManage={handlePortal}
          loading={portalLoading}
          error={actionError}
        />
      );
    }

    return (
      <PlanPicker
        onCheckout={handleCheckout}
        loading={checkoutLoading}
        error={actionError}
      />
    );
  }

  return (
    <section ref={sectionRef} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Corvus Pro</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Subscription</h2>
      </div>
      {renderBody()}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Account() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const recoveryState = searchParams.get('recovery') || null;

  const [checkingSession, setCheckingSession] = useState(true);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [banner, setBanner] = useState(null);

  const subscriptionRef = useRef(null);
  const scrollRequested = useRef(false);

  // Read Stripe return params on mount only.
  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      setBanner('subscribed');
      const next = new URLSearchParams(searchParams);
      next.delete('subscribed');
      setSearchParams(next, { replace: true });
    } else if (searchParams.get('cancelled') === 'true') {
      setBanner('cancelled');
      const next = new URLSearchParams(searchParams);
      next.delete('cancelled');
      setSearchParams(next, { replace: true });
    }

    if (searchParams.get('upgrade') === 'true') {
      scrollRequested.current = true;
      const next = new URLSearchParams(searchParams);
      next.delete('upgrade');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session gate.
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

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(false);
    try {
      const data = await apiFetch('/api/dashboard/summary');
      setSummary(data);
    } catch {
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch summary once session is confirmed.
  useEffect(() => {
    if (!checkingSession) fetchSummary();
  }, [checkingSession, fetchSummary]);

  // Scroll to subscription section once rendered (from ?upgrade=true).
  useEffect(() => {
    if (!checkingSession && scrollRequested.current && subscriptionRef.current) {
      scrollRequested.current = false;
      subscriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [checkingSession, summaryLoading]);

  if (checkingSession) {
    return (
      <AppLayout>
        <p className="text-sm text-[var(--color-text-secondary)]">Checking account access…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {banner && <SubscriptionBanner type={banner} onDismiss={() => setBanner(null)} />}

      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Corvus</p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl">Account</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          Manage your Corvus Pro subscription and fantasy platform connections.
        </p>
      </section>

      <SubscriptionSection
        subscription={summary?.subscription}
        summaryLoading={summaryLoading}
        summaryError={summaryError}
        onRefetch={fetchSummary}
        sectionRef={subscriptionRef}
      />

      <div className="border-t border-[var(--color-border)] pt-6">
        <section className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Platforms</p>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Platform Connections</h2>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Connect the fantasy platforms Corvus uses to read your rosters.
          </p>
        </section>
        <div className="mt-4">
          <PlatformConnections recoveryState={recoveryState} />
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <section className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Appearance</p>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Team Theme</h2>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Choose your team. Corvus colors its entire interface to match.
          </p>
        </section>
        <div className="mt-4">
          <Link
            to="/account/appearance"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            Customize Team Colors
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
