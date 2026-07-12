import { useEffect, useRef, useState } from 'react';
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
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(10, 10, 11, 0.6)' }}
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
            This removes Omen-stored platform connections, saved moves, consent records, and profile data.
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
  const [searchParams] = useSearchParams();
  const recoveryState = searchParams.get('recovery') || null;

  const [checkingSession, setCheckingSession] = useState(true);

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

  // Phase 1.5g.3: Account is settings-only — no live fantasy recommendation
  // data on the page — so cultural-moment chrome is mock-safe here.
  useEffect(() => {
    setDataMode('mock');
    return () => setDataMode(null);
  }, []);

  if (checkingSession) {
    return (
      <AppLayout>
        <p className="text-sm text-[var(--color-text-secondary)]">Checking account access…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-team-accent)]">Omen</p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl">Account</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          Manage your fantasy platform connections and account preferences.
        </p>
      </section>

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

      <PrivacySection />
    </AppLayout>
  );
}
