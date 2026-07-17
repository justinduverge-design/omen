import React from 'react';
import PlayerChip from './PlayerChip'; // Use direct import to avoid circular dependency in index

/**
 * PlayerRow — canonical display row (Phase A)
 *
 * Displays a full player context row: name, position, team, values, and states.
 */
const PlayerRow = ({
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
}) => {
  // Base structural container styles
  let containerClasses = `flex items-center justify-between p-3 rounded-lg border bg-[var(--color-surface-1)] transition-colors duration-200 motion-reduce:transition-none motion-reduce:duration-0 ${className}`;

  // State styling overrides
  if (unavailable) {
    containerClasses += ' border-[var(--color-border)] opacity-60 grayscale-[50%]';
  } else if (selected) {
    containerClasses += ' border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]';
  } else if (recommended) {
    containerClasses += ' border-[var(--color-omen)] bg-[color-mix(in_srgb,var(--color-omen)_10%,transparent)]';
  } else {
    containerClasses += ' border-[var(--color-border)]';
  }

  // Interactivity handling
  const isInteractive = Boolean(onClick);
  if (isInteractive) {
    containerClasses += ' cursor-pointer hover:border-[var(--color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]';
  }

  const Component = isInteractive ? 'button' : 'div';
  const interactionProps = isInteractive ? { onClick, type: 'button' } : {};

  return (
    <Component className={containerClasses} {...interactionProps} {...props}>
      <div className="flex items-center gap-4">
        {/* Left Side: Identity */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <PlayerChip name={name} position={position} size="md" className="border-none bg-transparent p-0" />
            {team && (
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                {team}
              </span>
            )}
          </div>

          {/* Metadata Row (Status Indicators) */}
          {(unavailable || injuryNote || selected || recommended) && (
            <div className="flex items-center gap-2 text-xs font-medium mt-0.5">
              {unavailable && (
                <span className="text-[var(--color-risk-medium)] flex items-center gap-1">
                  <span aria-hidden="true">⚠️</span> Unavailable
                </span>
              )}
              {injuryNote && !unavailable && (
                <span className="text-[var(--color-text-tertiary)]">{injuryNote}</span>
              )}
              {selected && (
                <span className="text-[var(--color-accent)] flex items-center gap-1">
                  <span aria-hidden="true">✓</span> Selected
                </span>
              )}
              {recommended && !selected && (
                <span className="text-[var(--color-omen)] flex items-center gap-1">
                  <span aria-hidden="true">★</span> Recommended
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Value/Metric Slot */}
      {valueSlot && (
        <div className="flex-shrink-0 ml-4">
          {valueSlot}
        </div>
      )}
    </Component>
  );
};

export default PlayerRow;
