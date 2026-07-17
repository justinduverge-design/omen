import React from 'react';
import Chip from './Chip';

const PlayerChip = React.forwardRef(function PlayerChip({
  name,
  position,
  size = 'md',
  className = '',
  ...props
}, ref) {
  const positionLower = position?.toLowerCase() || '';
  const tone = positionLower ? `pos-${positionLower}` : 'neutral';

  const baseClasses = 'inline-flex items-center gap-1.5 font-medium whitespace-nowrap';
  const sizeClasses = size === 'sm' ? 'text-xs' : 'text-sm';

  const combinedClasses = `${baseClasses} ${sizeClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <span
      ref={ref}
      className={combinedClasses}
      {...props}
    >
      <span className="text-[var(--color-text-primary)] truncate">{name}</span>
      {position && (
        <Chip tone={tone} size={size}>
          {position}
        </Chip>
      )}
    </span>
  );
});

export default PlayerChip;
