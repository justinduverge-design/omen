import { Link } from 'react-router-dom';

export default function UpgradeState({
  eyebrow = 'Corvus Pro',
  title = 'Upgrade to unlock',
  message,
  ctaLabel = 'Upgrade to Pro',
  ctaTo = '/account?upgrade=true',
}) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-10 text-center">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">{eyebrow}</p>
      )}
      {title && <p className="mt-3 text-lg font-semibold text-white">{title}</p>}
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {message ?? 'Most Valuable Play is a Corvus Pro feature. Upgrade to receive your personalized weekly move.'}
      </p>
      <Link
        className="mt-6 inline-flex items-center rounded-md bg-purple-500/15 px-5 py-2.5 text-sm font-semibold text-purple-300 transition-colors hover:bg-purple-500/25"
        to={ctaTo}
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}
