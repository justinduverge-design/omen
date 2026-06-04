export default function DisconnectedState({
  eyebrow,
  title,
  message,
  ctaLabel = 'Connect a platform',
  ctaHref = '/account',
}) {
  return (
    <div
      className="rounded-xl border p-10 text-center"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
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
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-amber-400/20"
        style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
        href={ctaHref}
      >
        {ctaLabel} →
      </a>
    </div>
  );
}
