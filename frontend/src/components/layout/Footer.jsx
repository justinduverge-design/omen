import { Link } from 'react-router';
import { YAHOO_CONNECTIONS_ENABLED } from '../../lib/yahooAuth.js';

/**
 * Yahoo attribution is a contractual obligation, not a courtesy.
 *
 * The Yahoo API Access and Use Agreement (executed 2026-08-20, Docusign
 * envelope A1D54813-9307-84ED-83EA-FC24FBE40785) requires clear attribution
 * "wherever Yahoo Fantasy Information is displayed", and for web specifically:
 * in the footer of each such page, hyperlinked to an official Yahoo Fantasy
 * page.
 *
 * It is gated on YAHOO_CONNECTIONS_ENABLED rather than hardcoded because Omen
 * currently displays no Yahoo data at all — Yahoo is paused pending the
 * Fantasy Sports entitlement — and a footer claiming otherwise on every page
 * would be a false statement sitting next to our non-affiliation line.
 *
 * Gating on the same constant that re-enables Yahoo means the attribution
 * lights up on the flag flip rather than depending on someone remembering it.
 * It is deliberately over-inclusive once that flip happens: it shows on every
 * page rather than only Yahoo-bearing ones. Over-attributing is not a breach;
 * under-attributing is.
 */
function YahooAttribution() {
  if (!YAHOO_CONNECTIONS_ENABLED) return null;

  return (
    <p>
      Fantasy data provided by{' '}
      <a
        className="underline underline-offset-4"
        href="https://football.fantasysports.yahoo.com/"
        target="_blank"
        rel="noreferrer"
      >
        Yahoo Fantasy
      </a>
      .
    </p>
  );
}

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
            <Link className="-mx-2 inline-flex min-h-[44px] items-center px-2 underline underline-offset-4" style={{ color: 'var(--color-text-secondary)' }} to="/unsubscribe">Unsubscribe</Link>
          </div>
          <div className="space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
            <p>&copy; {new Date().getFullYear()} Valor Ventures Limited Liability Company. All rights reserved.</p>
            <p>Slops Saloon and Omen are products of Valor Ventures Limited Liability Company.</p>
            <YahooAttribution />
            <a className="inline-flex min-h-[44px] items-center underline underline-offset-4" href="mailto:legal@slopssaloon.com">legal@slopssaloon.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
