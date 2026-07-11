import { Link } from 'react-router-dom';
import { Card } from './Card.jsx';

const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === 'true';
const APP_STORE_BUILD = import.meta.env.VITE_APP_STORE_BUILD === 'true';

export default function UpgradeState({
  eyebrow = 'Omen Pro',
  title = 'Upgrade to unlock',
  message,
  ctaLabel = 'Upgrade to Pro',
  ctaTo = '/account?upgrade=true',
}) {
  // Billing is disabled — every authenticated user gets full Pro depth, so a
  // paywall should never render. The backend gate is a pass-through and
  // shouldn't report `needs_subscription`, but render nothing here too in
  // case that contract is ever violated. In an app-store build, paid-unlock
  // copy must never render regardless of the billing flag.
  if (!BILLING_ENABLED || APP_STORE_BUILD) return null;

  return (
    <Card
      variant="outlined"
      className="p-10 text-center"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-omen) 40%, transparent)',
        background: 'color-mix(in srgb, var(--color-omen) 6%, transparent)',
      }}
    >
      {eyebrow && (
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-omen)' }}
        >
          {eyebrow}
        </p>
      )}
      {title && (
        <p
          className="mt-3 text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </p>
      )}
      <p
        className="mt-2 text-sm leading-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {message ?? 'Most Valuable Play is a Omen Pro feature. Upgrade to receive your personalized weekly move.'}
      </p>
      <Link
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md px-5 py-2.5 text-sm font-semibold transition-colors bg-[var(--color-omen)]/15 hover:bg-[var(--color-omen)]/25"
        style={{ color: 'var(--color-omen)' }}
        to={ctaTo}
      >
        {ctaLabel} →
      </Link>
    </Card>
  );
}
