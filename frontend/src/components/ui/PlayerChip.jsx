import React from 'react';
import Chip from './Chip';

const PlayerChip = React.forwardRef(function PlayerChip({
  name,
  position,
  size = 'md',
  className = '',
  ...props
}, ref) {
  const posTone = position ? `pos-${position.toLowerCase()}` : 'neutral';

  let sizeClasses = '';
  if (size === 'sm') {
    sizeClasses = 'text-xs gap-1.5';
  } else {
    // md
    sizeClasses = 'text-sm gap-2';
  }

  const baseClasses = 'inline-flex items-center font-medium text-[var(--color-text-primary)] whitespace-nowrap';
  const combinedClasses = `${baseClasses} ${sizeClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <span
      ref={ref}
      className={combinedClasses}
      {...props}
    >
      {position && (
        <Chip tone={posTone} size={size}>
          {position}
        </Chip>
      )}
      <span className="truncate">{name}</span>
    </span>
  );
});

export default PlayerChip;
