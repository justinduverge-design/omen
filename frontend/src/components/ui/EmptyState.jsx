import React from 'react';

export default function EmptyState({ eyebrow, title, message, cta }) {
  const renderCta = () => {
    if (!cta) return null;

    if (React.isValidElement(cta)) {
      return (
        <div className="mt-6">
          {cta}
        </div>
      );
    }

    // Fallback for legacy cta object { label, href }
    return (
      <a
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
        href={cta.href}
      >
        {cta.label} →
      </a>
    );
  };

  return (
    <div
      className="rounded-xl border border-dashed p-10 text-center"
      style={{
        borderColor: 'var(--color-border)',
        background: 'transparent',
        '--color-text-secondary': 'var(--color-card-text-secondary, var(--color-text-secondary))',
        '--color-text-primary': 'var(--color-card-text-primary, var(--color-text-primary))',
      }}
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
      {renderCta()}
    </div>
  );
}
