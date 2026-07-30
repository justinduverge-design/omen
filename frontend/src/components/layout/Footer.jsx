import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer
      className="border-t"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <span
          className="font-display text-sm uppercase tracking-[0.2em]"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Omen
        </span>
        <div className="space-y-2 text-xs sm:text-right">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
            <Link className="-mx-2 inline-flex min-h-[44px] items-center px-2 underline underline-offset-4" style={{ color: 'var(--color-text-secondary)' }} to="/privacy">Privacy</Link>
            <Link className="-mx-2 inline-flex min-h-[44px] items-center px-2 underline underline-offset-4" style={{ color: 'var(--color-text-secondary)' }} to="/terms">Terms</Link>
            <Link className="-mx-2 inline-flex min-h-[44px] items-center px-2 underline underline-offset-4" style={{ color: 'var(--color-text-secondary)' }} to="/support">Support</Link>
            <Link className="-mx-2 inline-flex min-h-[44px] items-center px-2 underline underline-offset-4" style={{ color: 'var(--color-text-secondary)' }} to="/delete-account">Delete account</Link>
          </div>
          <div className="space-y-1" style={{ color: 'var(--color-text-tertiary)' }}>
            <p>&copy; 2026 Valor Ventures LLC. All rights reserved.</p>
            <p>Slops Saloon and Omen are products of Valor Ventures LLC.</p>
            <a className="underline underline-offset-4" href="mailto:owner@slopssaloon.com">owner@slopssaloon.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
