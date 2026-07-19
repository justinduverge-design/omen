import { confidenceBarStyle } from '../../lib/confidenceGradient.js';

/**
 * Meter.jsx — horizontal gauge / confidence bar.
 *
 * Consolidates the two hand-built ConfidenceBar implementations
 * (OmenOfTheWeek.jsx, DraftAssistant.jsx), both of which wrap
 * lib/confidenceGradient.js. The queued B3 DecisionBrief needs a third.
 *
 * Two layouts cover both existing callers:
 *  - 'stacked' (default): header row (label + value) above a full-width bar,
 *    optional hint below. Matches OmenOfTheWeek's Confidence block.
 *  - 'inline': bar (flex-1) with the value to its right, no header. Matches
 *    DraftAssistant's compact bar.
 *
 * The fill defaults to the confidence gradient (crimson→amber→green by value);
 * pass `fillStyle` to override for a non-confidence meter. `confidenceBarStyle`
 * already sets both width and background, so it drives the fill entirely.
 *
 * Props:
 *  - value            0-100 (clamped)
 *  - label            header label text (stacked layout)
 *  - showValue        render "{value}%"
 *  - valueLabel       extra text appended after the % (e.g. a score label)
 *  - hint             muted text below the bar (stacked layout)
 *  - layout           'stacked' | 'inline'
 *  - size             'sm' | 'md' | 'lg'  (bar height)
 *  - fillStyle        style override for the fill (default: confidenceBarStyle(value))
 *  - trackColor       track background (default var(--color-surface-2))
 */

const BAR_HEIGHT = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

export function Meter({
  value,
  label,
  showValue = false,
  valueLabel,
  hint,
  layout = 'stacked',
  size = 'md',
  fillStyle,
  trackColor = 'var(--color-surface-2)',
  className = '',
  ...rest
}) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const heightClass = BAR_HEIGHT[size] ?? BAR_HEIGHT.md;
  const resolvedFill = fillStyle ?? confidenceBarStyle(pct);

  const bar = (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Meter'}
      className={`${heightClass} overflow-hidden rounded-full`}
      style={{ background: trackColor }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
        style={resolvedFill}
      />
    </div>
  );

  const valueEl = showValue ? (
    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
      <span className="font-mono tabular-nums">{pct}%</span>
      {valueLabel ? <span className="font-sans"> · {valueLabel}</span> : null}
    </span>
  ) : null;

  if (layout === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()} {...rest}>
        <div className="flex-1">{bar}</div>
        {valueEl && <span className="w-16 shrink-0 text-right">{valueEl}</span>}
      </div>
    );
  }

  return (
    <div className={className} {...rest}>
      {(label || valueEl) && (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label ? (
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
              {label}
            </span>
          ) : <span />}
          {valueEl}
        </div>
      )}
      {bar}
      {hint ? (
        <p className="mt-2 text-xs leading-5" style={{ color: 'var(--color-text-tertiary)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Meter;
