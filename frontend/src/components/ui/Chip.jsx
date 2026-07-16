import React from 'react';

const CHIP_TONES = {
  accent: { bg: 'var(--color-accent)', text: 'var(--color-text-on-accent)' },
  omen: { bg: 'var(--color-omen)', text: 'var(--color-text-on-accent)' },
  neutral: { bg: 'var(--color-surface-2)', text: 'var(--color-text-primary)' },
  'pos-rb': { bg: 'var(--color-pos-rb)', text: 'var(--color-text-on-accent)' },
  'pos-wr': { bg: 'var(--color-pos-wr)', text: 'var(--color-text-on-accent)' },
  'pos-qb': { bg: 'var(--color-pos-qb)', text: 'var(--color-text-on-accent)' },
  'pos-te': { bg: 'var(--color-pos-te)', text: 'var(--color-text-on-accent)' },
  'pos-def': { bg: 'var(--color-pos-def)', text: 'var(--color-text-on-accent)' },
  'pos-k': { bg: 'var(--color-pos-k)', text: 'var(--color-text-on-accent)' },
};

const Chip = React.forwardRef(function Chip({
  tone = 'neutral',
  size = 'md',
  className = '',
  style = {},
  children,
  ...props
}, ref) {
  const toneConfig = CHIP_TONES[tone] || CHIP_TONES.neutral;

  let sizeClasses = '';
  if (size === 'sm') {
    sizeClasses = 'px-1.5 py-0.5 text-[10px]';
  } else {
    // md
    sizeClasses = 'px-2.5 py-0.5 text-xs';
  }

  const computedStyle = {
    backgroundColor: toneConfig.bg,
    color: toneConfig.text,
  };

  const baseClasses = 'inline-flex items-center justify-center font-bold uppercase tracking-wide rounded-sm whitespace-nowrap';

  const combinedClasses = `${baseClasses} ${sizeClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <span
      ref={ref}
      className={combinedClasses}
      style={{ ...style, ...computedStyle }}
      {...props}
    >
      {children}
    </span>
  );
});

export default Chip;
