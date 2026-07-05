import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { consumeNextUrl, storeNextUrl } from '../lib/nextUrl.js';
import { supabase } from '../lib/supabase.js';

// ── Shared primitives ─────────────────────────────────────────────────────────

function AuthButton({ children, onClick, disabled = false, variant = 'default' }) {
  const base =
    'w-full flex items-center justify-center gap-3 min-h-[48px] px-5 rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const variants = {
    default:
      'border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] focus-visible:outline-[var(--color-accent)]',
    gold:
      'bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-hover)] focus-visible:outline-[var(--color-accent)]',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="text-xs text-[var(--color-text-tertiary)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}

// ── OAuth provider icons (inline SVG — no icon library dep) ──────────────────

function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4" />
      <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.07 0-3.83-1.4-4.46-3.29H1.86v2.07A8 8 0 0 0 8.98 17z" fill="#34A853" />
      <path d="M4.52 10.52A4.8 4.8 0 0 1 4.27 9c0-.53.09-1.04.25-1.52V5.41H1.86A8 8 0 0 0 .98 9c0 1.29.31 2.51.88 3.59l2.66-2.07z" fill="#FBBC05" />
      <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.12 4.41l2.66 2.07C5.16 5.58 6.92 4.18 8.98 4.18z" fill="#EA4335" />
    </svg>
  );
}


function DiscordIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 127.14 96.36" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" fill="#5865F2" />
    </svg>
  );
}

// ── Magic link form ───────────────────────────────────────────────────────────

function MagicLinkForm({ onSent }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/login' },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      onSent(email);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="login-email">Email address</label>
      <input
        ref={inputRef}
        id="login-email"
        aria-label="Email address"
        autoComplete="email"
        className="w-full min-h-[48px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none transition-colors focus:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
        placeholder="you@example.com"
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className="w-full min-h-[48px] rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-black transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-busy={loading}
        disabled={loading}
        type="submit"
      >
        {loading ? 'Sending link…' : 'Continue with Email'}
      </button>
      {error && (
        <p className="text-xs text-red-400" role="alert">{error}</p>
      )}
    </form>
  );
}

// ── Sent confirmation ─────────────────────────────────────────────────────────

function MagicLinkSent({ email }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-4 text-center">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Check your email</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
        We sent a sign-in link to <span className="text-[var(--color-text-primary)]">{email}</span>.
        Click it to continue.
      </p>
    </div>
  );
}

// ── Main login page ───────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sentEmail, setSentEmail] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const accountDeleted = searchParams.get('deleted') === 'true';

  // Store ?next= param on first render (before any auth action changes the URL)
  useEffect(() => {
    const next = searchParams.get('next');
    if (next) storeNextUrl(next);
  }, [searchParams]);

  // Listen for Supabase session (handles magic-link and OAuth callbacks)
  useEffect(() => {
    let mounted = true;

    async function handleSession(session) {
      if (!session || !mounted) return;
      setRedirecting(true);
      const dest = consumeNextUrl();
      // If dest is /omen, confirm a league is connected before routing there.
      // If not connected, send to /account/connect?next=/omen instead.
      if (dest === '/omen') {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            // Let ConnectLeague handle the omen-gate check
            navigate('/account/connect?next=/omen', { replace: true });
            return;
          }
        } catch (_) { /* fall through */ }
      }
      navigate(dest, { replace: true });
    }

    // Check for an existing session (e.g. user already signed in)
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) handleSession(data.session);
    });

    // Listen for session from OAuth/magic-link callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) handleSession(session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function signInWithProvider(provider) {
    setOauthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/login',
      },
    });
    if (error) setOauthError(error.message);
  }

  if (redirecting) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">Signing you in…</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Atmospheric glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(184,149,42,0.10) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-10 text-center">
          <img
            src="/omen-horizontal-lockup-transparent.png"
            alt="Omen"
            className="mx-auto h-12 w-auto"
          />
          <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-[var(--color-text-tertiary)]">
            Fantasy Intelligence
          </p>
        </div>

        {/* Headline */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">
            Your best call,<br />every time.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            Sign in to get your weekly Omen — your Most Valuable Play.
            Or try Trade Analyzer without an account.
          </p>
        </div>

        {/* Auth options */}
        {accountDeleted && (
          <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Omen data deleted.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
              Sign in again when you want to rebuild your setup.
            </p>
          </div>
        )}

        {sentEmail ? (
          <MagicLinkSent email={sentEmail} />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Social providers */}
            <AuthButton onClick={() => signInWithProvider('google')}>
              <GoogleIcon />
              Continue with Google
            </AuthButton>

            <AuthButton onClick={() => signInWithProvider('discord')}>
              <DiscordIcon />
              Continue with Discord
            </AuthButton>

            <Divider label="or" />

            {/* Email magic link */}
            <MagicLinkForm onSent={setSentEmail} />

            {oauthError && (
              <p className="text-xs text-red-400" role="alert">{oauthError}</p>
            )}
          </div>
        )}

        {/* Footer links */}
        <div className="mt-8 text-center">
          <a
            className="flex min-h-[44px] items-center justify-center text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
            href="/trade"
          >
            Try Trade Analyzer without signing in →
          </a>
        </div>
      </div>
    </div>
  );
}
