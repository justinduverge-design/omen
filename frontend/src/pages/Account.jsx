import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import PlatformConnections from '../components/platforms/PlatformConnections.jsx';
import { apiFetch } from '../lib/api.js';
import {
  ACCOUNT_DELETE_CONFIRMATION,
  isAccountDeleteConfirmation,
} from '../lib/accountDeletion.js';
import { setDataMode } from '../lib/dataMode.js';
import { storeNextUrl } from '../lib/nextUrl.js';
import { supabase } from '../lib/supabase.js';
import { useFocusTrap } from '../lib/useFocusTrap.js';

const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === 'true';

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
          <p className="text-sm font-semibold text-emerald-300">Welcome to Omen Pro.</p>
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
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-team-accent)]/20 bg-[var(--color-team-accent)]/5 px-5 py-3">
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
          ? 'border-[var(--color-team-accent)]/60 bg-[var(--color-team-accent)]/10'
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
            <span className={`font-mono text-sm tabular-nums ${isSelected ? 'text-[var(--color-team-accent)]' : 'text-[var(--color-text-secondary)]'}`}>
              {price}
            </span>
          )}
        </div>
        <span
          className={[
            'rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0',
            isSelected
              ? 'border-[var(--color-team-accent)]/30 bg-[var(--color-team-accent)]/10 text-[var(--color-team-accent)]'
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
        className="w-full rounded-xl bg-[var(--color-team-accent)] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)] disabled:opacity-60"
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

// ── Billing dates ─────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function BillingDates({ subscription }) {
  const plan = subscription?.plan;
  const status = subscription?.status;

  const trialEndsLabel = fmtDate(subscription?.trial_ends_at);

  let billingLabel = null;
  let billingKey = 'Next billing date';

  if (plan === 'season') {
    billingLabel = fmtDate(subscription?.expires_at) || fmtDate(subscription?.current_period_end);
    billingKey = 'Access through';
  } else {
    if (subscription?.current_period_end) {
      billingLabel = fmtDate(subscription.current_period_end);
    } else if (status === 'trialing' && subscription?.trial_ends_at) {
      billingLabel = fmtDate(subscription.trial_ends_at);
    }
  }

  const rows = [];
  if (trialEndsLabel) rows.push({ key: 'Trial ends', value: trialEndsLabel });
  if (billingLabel) rows.push({ key: billingKey, value: billingLabel });

  if (rows.length === 0) return null;

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="border-b px-4 py-2.5"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-team-accent)' }}
        >
          Billing
        </p>
      </div>
      <dl style={{ background: 'var(--color-surface-1)' }}>
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="flex items-center justify-between px-4 py-3"
            style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}
          >
            <dt
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {row.key}
            </dt>
            <dd
              className="text-sm font-medium tabular-nums"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Omen Pro · Active
        </span>
        {planLabel && <span className="text-xs text-[var(--color-text-secondary)]">{planLabel}</span>}
      </div>

      <BillingDates subscription={subscription} />

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
    if (!BILLING_ENABLED) {
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">All features included</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
            Every Omen tool is available on your account.
          </p>
        </div>
      );
    }

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
            className="mt-3 text-xs font-semibold text-[var(--color-team-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
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
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">Omen Pro</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Subscription</h2>
      </div>
      {renderBody()}
    </section>
  );
}

// ── Privacy section ──────────────────────────────────────────────────────────

function AccountDeleteDialog({ open, onClose }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = isAccountDeleteConfirmation(confirmation);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmation('');
    setSubmitting(false);
    setTimeout(() => inputRef.current?.focus(), 50);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, submitting]);

  useFocusTrap(dialogRef, open);

  async function handleDelete(e) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/api/user/delete', {
        method: 'DELETE',
        body: { confirmation },
      });
      await supabase.auth.signOut().catch(() => {});
      navigate('/login?deleted=true', { replace: true });
    } catch (err) {
      if (err?.status === 400) {
        setError('The phrase has to match exactly. Type it in all caps.');
      } else if (err?.status === 401) {
        setError('Your session expired. Sign in again before deleting Omen data.');
      } else {
        setError('Omen could not delete your data right now. Try again.');
      }
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60"
        onClick={submitting ? undefined : onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center">
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-delete-title"
          aria-describedby="account-delete-copy"
          className="w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 shadow-2xl"
          onSubmit={handleDelete}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-risk-high)]">Final check</p>
              <h3 id="account-delete-title" className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Delete Omen data
              </h3>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close delete confirmation"
              disabled={submitting}
              onClick={onClose}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p id="account-delete-copy" className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
            This removes Omen-stored platform connections, saved moves, consent records, subscription records, and profile data.
            It does not change data held by fantasy platforms or sign-in providers.
          </p>

          <div className="mt-4 rounded-lg border border-[var(--color-risk-high)]/40 bg-[var(--color-risk-high)]/10 px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">This cannot be undone.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
              Type <span className="font-mono text-[var(--color-text-primary)]">{ACCOUNT_DELETE_CONFIRMATION}</span> to confirm.
            </p>
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]" htmlFor="account-delete-confirmation">
            Confirmation phrase
          </label>
          <input
            ref={inputRef}
            id="account-delete-confirmation"
            autoComplete="off"
            className="mt-2 w-full min-h-[48px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-base text-[var(--color-text-primary)] outline-none transition-colors duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-risk-high)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
            disabled={submitting}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />

          {error && (
            <p className="mt-3 text-sm text-[var(--color-risk-high)]" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={onClose}
            >
              Keep my data
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-lg bg-[var(--color-risk-high)] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Deleting Omen data…' : 'Delete Omen data'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function PrivacySection() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="border-t border-[var(--color-border)] pt-6">
      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">Privacy</p>
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Omen Data</h2>
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
          Delete the data Omen stores for your account, including platform connections and move history.
        </p>
      </section>
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Delete Omen data</p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
              Omen will remove saved data and sign this browser out after the request completes.
            </p>
          </div>
          <button
            type="button"
            className="min-h-[44px] shrink-0 rounded-lg border border-[var(--color-risk-high)]/50 px-5 text-sm font-semibold text-[var(--color-risk-high)] transition-colors duration-150 hover:bg-[var(--color-risk-high)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
            onClick={() => setDialogOpen(true)}
          >
            Delete data
          </button>
        </div>
      </div>
      <AccountDeleteDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
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
      // Billing is disabled — there's no subscription section to scroll to.
      // Just strip the param and land on the account page normally.
      if (BILLING_ENABLED) scrollRequested.current = true;
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

  // Phase 1.5g.3: Account is settings-only — no live fantasy recommendation
  // data on the page — so cultural-moment chrome is mock-safe here.
  useEffect(() => {
    setDataMode('mock');
    return () => setDataMode(null);
  }, []);

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
      {BILLING_ENABLED && banner && <SubscriptionBanner type={banner} onDismiss={() => setBanner(null)} />}

      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">Omen</p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl">Account</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          Manage your fantasy platform connections and account preferences.
        </p>
      </section>

      {BILLING_ENABLED && (
        <SubscriptionSection
          subscription={summary?.subscription}
          summaryLoading={summaryLoading}
          summaryError={summaryError}
          onRefetch={fetchSummary}
          sectionRef={subscriptionRef}
        />
      )}

      <div className="border-t border-[var(--color-border)] pt-6">
        <section className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Platform Connections</h2>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Connect the fantasy platforms Omen uses to read your rosters.
          </p>
        </section>
        <div className="mt-4">
          <PlatformConnections recoveryState={recoveryState} />
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <section className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">Appearance</p>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Team Theme</h2>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Choose your team. Omen colors its entire interface to match.
          </p>
        </section>
        <div className="mt-4">
          <Link
            to="/account/appearance"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-team-accent)] hover:text-[var(--color-team-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)]"
          >
            Customize Team Colors
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      <PrivacySection />
    </AppLayout>
  );
}
