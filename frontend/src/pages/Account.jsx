import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
      <div className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 px-5 py-3">
        <p className="text-sm text-amber-300/80">Checkout cancelled — no changes were made.</p>
        <button
          className="ml-4 shrink-0 text-xs text-slate-500 transition-colors hover:text-slate-300"
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

function PlanCard({ option, selected, onSelect }) {
  const isSelected = selected === option.id;
  return (
    <button
      className={[
        'w-full rounded-xl border p-4 text-left transition-colors',
        isSelected
          ? 'border-purple-500/60 bg-purple-500/10'
          : 'border-slate-800 bg-slate-900 hover:border-slate-700',
      ].join(' ')}
      type="button"
      onClick={() => onSelect(option.id)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-semibold ${isSelected ? 'text-purple-200' : 'text-white'}`}>
          {option.label}
        </p>
        <span
          className={[
            'rounded-full border px-2 py-0.5 text-xs font-semibold',
            isSelected
              ? 'border-purple-400/30 bg-purple-400/10 text-purple-300'
              : 'border-slate-700 bg-slate-800 text-slate-400',
          ].join(' ')}
        >
          {option.badge}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-400">{option.description}</p>
    </button>
  );
}

function PlanPicker({ onCheckout, loading, error }) {
  const [selected, setSelected] = useState('monthly');
  const selectedOption = PLAN_OPTIONS.find((o) => o.id === selected);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {PLAN_OPTIONS.map((opt) => (
          <PlanCard key={opt.id} option={opt} selected={selected} onSelect={setSelected} />
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        className="w-full rounded-xl bg-purple-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-400 disabled:opacity-60"
        disabled={loading}
        type="button"
        onClick={() => onCheckout(selected)}
      >
        {loading ? 'Redirecting to Stripe…' : selectedOption?.cta ?? 'Continue to checkout'}
      </button>

      <p className="text-center text-xs text-slate-500">
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
        {planLabel && <span className="text-xs text-slate-400">{planLabel}</span>}
        {periodLabel && (
          <span className="ml-auto text-xs text-slate-500">
            {renewsOrExpires} {periodLabel}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {subscription?.can_manage_billing && (
        <button
          className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-60"
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
        <div className="animate-pulse space-y-3">
          <div className="h-14 rounded-xl bg-slate-800/60" />
          <div className="h-14 rounded-xl bg-slate-800/40" />
          <div className="h-11 w-full rounded-xl bg-slate-800/40" />
        </div>
      );
    }

    if (summaryError || subscription?.status === 'unknown') {
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Could not load subscription status.</p>
          <button
            className="mt-3 text-xs font-semibold text-amber-400 transition-colors hover:text-amber-300"
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
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Corvus Pro</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Subscription</h2>
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
        <p className="text-sm text-slate-400">Checking account access…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {banner && <SubscriptionBanner type={banner} onDismiss={() => setBanner(null)} />}

      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Corvus</p>
        <h1 className="mt-3 font-serif text-4xl tracking-wide text-white sm:text-5xl">Account</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
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

      <div className="border-t border-slate-800 pt-6">
        <section className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Platforms</p>
          <h2 className="text-xl font-semibold text-white">Platform Connections</h2>
          <p className="text-sm leading-6 text-slate-400">
            Connect the fantasy platforms Corvus uses to read your rosters.
          </p>
        </section>
        <div className="mt-4">
          <PlatformConnections recoveryState={recoveryState} />
        </div>
      </div>
    </AppLayout>
  );
}
