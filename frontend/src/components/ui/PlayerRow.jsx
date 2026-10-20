import React from 'react';
import PlayerChip from './PlayerChip';
import Chip from './Chip';

const PlayerRow = React.forwardRef(function PlayerRow(
  {
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
  },
  ref,
) {
  const isInteractive = typeof onClick === 'function';

  const baseClasses = 'flex items-center justify-between p-3 rounded-lg border transition-colors text-left w-full';

  let stateClasses = 'bg-(--color-surface-1) border-(--color-border-subtle)';

  if (selected) {
    stateClasses = 'bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface-1))] border-(--color-accent)';
  } else if (recommended) {
    stateClasses = 'bg-[color-mix(in_srgb,var(--color-omen)_8%,var(--color-surface-1))] border-(--color-omen)';
  }

  const interactiveClasses = isInteractive
    ? 'cursor-pointer hover:border-(--color-border) focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) active:scale-[0.99] active:transition-transform motion-reduce:active:transform-none'
    : '';

  const combinedClasses = `${baseClasses} ${stateClasses} ${interactiveClasses} ${className}`
    .trim()
    .replace(/\s+/g, ' ');

  const content = (
    <>
      <span className="flex items-center gap-3 min-w-0">
        <PlayerChip name={name} position={position} />

        <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
          {team && (
            <span className="text-xs text-(--color-text-secondary) font-medium uppercase tracking-wider">{team}</span>
          )}

          {(unavailable || injuryNote) && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-risk-medium) shrink-0" aria-hidden="true" />
              <span className="text-xs text-(--color-text-secondary) truncate">{injuryNote || 'Unavailable'}</span>
            </span>
          )}

          {selected && (
            <Chip tone="accent" size="sm">
              Selected
            </Chip>
          )}

          {recommended && !selected && (
            <Chip tone="omen" size="sm">
              Recommended
            </Chip>
          )}
        </span>
      </span>

      {valueSlot && <span className="ml-4 shrink-0 flex items-center">{valueSlot}</span>}
    </>
  );

  if (isInteractive) {
    return (
      <button ref={ref} type="button" className={combinedClasses} onClick={onClick} aria-pressed={selected} {...props}>
        {content}
      </button>
    );
  }

  return (
    <div ref={ref} className={combinedClasses} {...props}>
      {content}
    </div>
  );
});

export default PlayerRow;
