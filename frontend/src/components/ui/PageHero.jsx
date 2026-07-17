import React from 'react';

/**
 * PageHero — canonical page header foundation (Phase A)
 *
 * Designed to provide a consistent eyebrow/title/subtitle/trailing hierarchy.
 * Uses the live app's current heading font stack (Alegreya Sans, via font-display).
 * See Blueprints/handoffs/jules/jules-04-pagehero.md for details.
 */
const PageHero = ({
  eyebrow,
  title,
  subtitle,
  trailing,
  status,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-4 mb-8 ${className}`} {...props}>
      {/* Top row: Eyebrow + Status (if either exists) */}
      {(eyebrow || status) && (
        <div className="flex items-center gap-3 text-[var(--color-text-tertiary)]">
          {eyebrow && (
            <p
              aria-hidden="false"
              className="font-mono text-xs font-medium uppercase tracking-wider"
            >
              {eyebrow}
            </p>
          )}
          {eyebrow && status && <span aria-hidden="true" className="opacity-50">•</span>}
          {status && (
            <div className="flex items-center">
              {status}
            </div>
          )}
        </div>
      )}

      {/* Main row: Title + Trailing slot */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold text-[var(--color-text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-base text-[var(--color-text-secondary)] max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {trailing && (
          <div className="flex-shrink-0 flex items-center gap-3">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHero;
