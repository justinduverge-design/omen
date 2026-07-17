import React from 'react';
import PlayerChip from './PlayerChip';

const PlayerRow = React.forwardRef(function PlayerRow({
  name,
  position,
  team,
  valueSlot,
  selected = false,
  recommended = false,
  unavailable = false,
  injuryNote,
  onClick,
  className = '',
  ...props
}, ref) {
  const isInteractive = typeof onClick === 'function';
  const Component = isInteractive ? 'button' : 'div';

  const baseClasses = 'group flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors motion-reduce:transition-none motion-reduce:duration-0 text-left';

  let stateClasses = '';
  if (selected) {
    stateClasses = 'bg-[var(--color-surface-2)] border border-[var(--color-accent)] shadow-sm';
  } else if (recommended) {
    stateClasses = 'bg-[var(--color-surface-2)] border border-[var(--color-omen)] shadow-sm';
  } else {
    stateClasses = 'bg-[var(--color-surface-1)] border border-[var(--color-border)]';
  }

  if (isInteractive) {
    stateClasses += ' hover:bg-[var(--color-surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent';
  }

  let textDimmingClass = '';
  if (unavailable) {
    textDimmingClass = 'opacity-60';
  }

  const combinedClasses = `${baseClasses} ${stateClasses} ${textDimmingClass} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component
      ref={ref}
      className={combinedClasses}
      onClick={onClick}
      type={isInteractive ? 'button' : undefined}
      aria-selected={selected ? true : undefined}
      {...props}
    >
      <div className="flex flex-col gap-0.5">
        <PlayerChip name={name} position={position} size="md" />
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
          {team && <span>{team.toUpperCase()}</span>}
          {injuryNote && (
            <>
              <span>•</span>
              <span className={unavailable ? "text-[var(--color-risk-medium)] font-medium" : ""}>
                {injuryNote}
              </span>
            </>
          )}
        </div>
      </div>

      {valueSlot && (
        <div className="ml-4 flex-shrink-0">
          {valueSlot}
        </div>
      )}
    </Component>
  );
});

export default PlayerRow;
