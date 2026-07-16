import React from 'react';

const BADGE_TONES = {
  live: 'var(--color-data-live)',
  mock: 'var(--color-data-mock)',
  stale: 'var(--color-data-stub)',
  unavailable: 'var(--color-data-unavailable)',
  success: 'var(--color-risk-low)',
  risk: 'var(--color-risk-high)',
  neutral: 'var(--color-text-secondary)'
};

const Badge = React.forwardRef(function Badge({
  tone = 'neutral',
  size = 'md',
  className = '',
  style = {},
  children,
  ...props
}, ref) {
  const toneColor = BADGE_TONES[tone] || BADGE_TONES.neutral;

  let sizeClasses = '';
  if (size === 'sm') {
    sizeClasses = 'px-1.5 py-0.5 text-[10px] gap-1';
  } else {
    // md
    sizeClasses = 'px-2 py-0.5 text-xs gap-1.5';
  }

  // To maintain AA text contrast across both light and dark themes (especially for tones
  // like 'risk' where --color-risk-high is dark red in both themes), we use the tone color
  // for a tinted background and border, but keep the text as primary.
  const computedStyle = {
    color: 'var(--color-text-primary)',
    backgroundColor: `color-mix(in srgb, ${toneColor} 15%, transparent)`,
    borderColor: `color-mix(in srgb, ${toneColor} 30%, transparent)`,
  };

  if (tone === 'neutral') {
      computedStyle.color = 'var(--color-text-secondary)';
      computedStyle.backgroundColor = 'var(--color-surface-2)';
      computedStyle.borderColor = 'var(--color-border)';
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full border whitespace-nowrap';

  const combinedClasses = `${baseClasses} ${sizeClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <span
      ref={ref}
      className={combinedClasses}
      style={{ ...style, ...computedStyle }}
      {...props}
    >
      {/* We prepend a dot indicator to explicitly communicate the tone color since text is primary */}
      {tone !== 'neutral' && (
        <span
          aria-hidden="true"
          className="rounded-full shrink-0"
          style={{
            backgroundColor: toneColor,
            width: size === 'sm' ? '4px' : '6px',
            height: size === 'sm' ? '4px' : '6px'
          }}
        />
      )}
      {children}
    </span>
  );
});

export default Badge;
