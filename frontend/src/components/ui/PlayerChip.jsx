import React from 'react';

/**
 * PlayerChip — compact inline player reference (Phase A)
 *
 * Displays player name + position tag.
 * Used for dense contexts like a recommendation list.
 */
const PlayerChip = ({
  name,
  position,
  size = 'md',
  className = '',
  ...props
}) => {
  const isSm = size === 'sm';
  const posColorVar = position ? `--color-pos-${position.toLowerCase()}` : '--color-text-secondary';

  return (
    <div
      className={`inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] ${isSm ? 'px-2 py-0.5 gap-1.5' : 'px-3 py-1 gap-2'} ${className}`}
      {...props}
    >
      <span className={`font-semibold text-[var(--color-text-primary)] ${isSm ? 'text-xs' : 'text-sm'}`}>
        {name}
      </span>
      {position && (
        <span
          className={`font-mono uppercase font-bold tracking-wider rounded-full ${isSm ? 'px-1.5 text-[10px]' : 'px-2 text-xs'}`}
          style={{
            backgroundColor: `var(${posColorVar})`,
            color: 'var(--color-bg)' // High contrast for the dark text on position colors (or use appropriate token if available, but position tokens are background colors natively)
          }}
          aria-label={`Position: ${position}`}
        >
          {position}
        </span>
      )}
    </div>
  );
};

export default PlayerChip;
