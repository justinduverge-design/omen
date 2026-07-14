import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useFocusTrap } from '../../lib/useFocusTrap.js';

// ── Nav map ────────────────────────────────────────────────────────────────
// Items with `auth: true` only render when the user is signed in.
// Items with `auth: false` are always visible.
// Items with `auth: 'guest'` only render when NOT signed in.

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    auth: true,
    items: [
      { label: 'Football',         to: '/football' },
      { label: 'Omen of the Week', to: '/omen' },
      { label: 'The Ledger',       to: '/ledger', note: 'Your record' },
    ],
  },
  {
    label: 'Tools',
    auth: false,
    items: [
      { label: 'Trade Analyzer',  to: '/trade' },
      { label: 'Draft Assistant', to: '/draft' },
      { label: 'Waiver Wire',     to: '/waiver', auth: true },
    ],
  },
  {
    label: 'League',
    auth: true,
    items: [
      { label: 'Standings',      to: '/standings' },
      { label: 'Connect League', to: '/account/connect' },
    ],
  },
  {
    label: 'Account',
    auth: false,
    items: [
      { label: 'Account',         to: '/account',            auth: true  },
      { label: 'Sign In',         to: '/login',              auth: 'guest' },
    ],
  },
];

// ── Hamburger icon ─────────────────────────────────────────────────────────
function HamburgerIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
      <rect x="0" y="0"  width="18" height="2" rx="1" fill="currentColor" />
      <rect x="0" y="6"  width="14" height="2" rx="1" fill="currentColor" />
      <rect x="0" y="12" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

// ── Close icon ─────────────────────────────────────────────────────────────
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ── Nav item ───────────────────────────────────────────────────────────────
function NavItem({ to, label, note, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="group flex min-h-[44px] items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
      style={{
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: active ? 'var(--color-accent-muted)' : 'transparent',
        borderLeft: active ? '2px solid var(--color-accent)' : '2px solid transparent',
      }}
    >
      <span style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
        {label}
      </span>
      {note && (
        <span
          className="text-[11px] font-medium"
          style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
        >
          {note}
        </span>
      )}
    </Link>
  );
}

// ── Nav drawer ─────────────────────────────────────────────────────────────
function NavDrawer({ open, onClose, isAuthenticated }) {
  const location = useLocation();
  const drawerRef = useRef(null);
  const closeRef  = useRef(null);
  const navSections = NAV_SECTIONS;

  // Focus the close button when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => closeRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useFocusTrap(drawerRef, open);

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300 motion-reduce:transition-none"
        style={{
          background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        id="omen-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        inert={open ? undefined : ''}
        className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col transition-transform duration-300 ease-in-out motion-reduce:transition-none"
        style={{
          background: 'var(--color-surface-1)',
          borderRight: '1px solid var(--color-border)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center">
            <img
              src="/omen-horizontal-lockup-transparent.png"
              alt="Omen"
              className="h-7 w-auto"
            />
          </div>

          <button
            ref={closeRef}
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Site navigation">
          <div className="space-y-6">
            {navSections.map((section) => {
              // Section-level auth gate
              if (section.auth === true && !isAuthenticated) return null;
              if (section.auth === 'guest' && isAuthenticated) return null;

              // Filter items by per-item auth
              const visibleItems = section.items.filter((item) => {
                if (item.auth === true)    return isAuthenticated;
                if (item.auth === 'guest') return !isAuthenticated;
                return true;
              });
              if (!visibleItems.length) return null;

              return (
                <div key={section.label}>
                  <p
                    className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavItem
                        key={item.to}
                        to={item.to}
                        label={item.label}
                        note={item.note}
                        active={
                          item.to === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.to)
                        }
                        onClick={onClose}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Drawer footer */}
        <div
          className="px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                onClose();
                supabase.auth.signOut();
              }}
              className="mb-3 w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sign out
            </button>
          )}
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            &copy; {new Date().getFullYear()} Slops Saloon
          </p>
        </div>
      </div>
    </>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const burgerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) setIsAuthenticated(Boolean(data?.session)); })
      .catch(() => { if (mounted) setIsAuthenticated(false); });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });
    return () => { mounted = false; data?.subscription?.unsubscribe(); };
  }, []);

  function openDrawer()  { setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); setTimeout(() => burgerRef.current?.focus(), 50); }

  return (
    <>
      <header
        className="relative z-30 border-b"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">

          {/* Hamburger */}
          <button
            ref={burgerRef}
            type="button"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="omen-nav-drawer"
            onClick={openDrawer}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-surface-1)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <HamburgerIcon />
          </button>

          <Link
            to="/"
            className="flex min-h-[44px] items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
          >
            <img
              src="/omen-horizontal-lockup-transparent.png"
              alt="Omen"
              className="h-8 w-auto"
            />
          </Link>

        </div>
      </header>

      <NavDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
