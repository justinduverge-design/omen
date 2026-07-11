import { Card } from './Card.jsx';

export default function DisconnectedState({
  eyebrow,
  title,
  message,
  ctaLabel = 'Connect a platform',
  ctaHref = '/account',
}) {
  return (
    <Card variant="solid" className="p-10 text-center">
      {eyebrow && (
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-accent)' }}
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
      {message && (
        <p
          className="mt-2 text-sm leading-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {message}
        </p>
      )}
      <a
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md px-5 py-2.5 text-sm font-semibold transition-colors bg-[var(--color-accent-muted)] hover:bg-[var(--color-accent)]/20"
        style={{ color: 'var(--color-accent)' }}
        href={ctaHref}
      >
        {ctaLabel} →
      </a>
    </Card>
  );
}
