import { Link } from 'react-router-dom';

const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === 'true';

export default function UpgradeState({
  eyebrow = 'Corvus Pro',
  title = 'Upgrade to unlock',
  message,
  ctaLabel = 'Upgrade to Pro',
  ctaTo = '/account?upgrade=true',
}) {
  // Billing is disabled — every authenticated user gets full Pro depth, so a
  // paywall should never render. The backend gate is a pass-through and
  // shouldn't report `needs_subscription`, but render nothing here too in
  // case that contract is ever violated.
  if (!BILLING_ENABLED) return null;

  return (
    <div
      className="rounded-xl border p-10 text-center"
      style={{ borderColor: 'rgba(93,45,142,0.4)', background: 'rgba(93,45,142,0.06)' }}
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
        {message ?? 'Most Valuable Play is a Corvus Pro feature. Upgrade to receive your personalized weekly move.'}
      </p>
      <Link
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-purple-500/25"
        style={{ background: 'rgba(93,45,142,0.06)', color: 'var(--color-omen)' }}
        to={ctaTo}
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}
