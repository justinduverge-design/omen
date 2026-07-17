import React from 'react';
import { Tooltip } from './index.js'; // Brief 05 Tooltip is merged and available
import { confidenceBarStyle } from '../../lib/confidenceGradient';

/**
 * MetricStrip — canonical metric summary row (Phase A)
 *
 * Displays a metric with a label, value, and optional delta with tone.
 * Handles confidence gradient metrics specifically if tone is "confidence" (or if
 * passed explicit instructions via generic tone usage vs. confidence gradients).
 */
const MetricStrip = ({
  label,
  value,
  delta,
  tone = 'neutral',
  explanation,
  className = '',
  ...props
}) => {
  // Delta tone processing
  let deltaColorClass = 'text-[var(--color-text-secondary)]';
  if (tone === 'positive') deltaColorClass = 'text-[var(--color-risk-low)]';
  if (tone === 'negative') deltaColorClass = 'text-[var(--color-risk-high)]';

  // Ensure delta has a visible sign
  let displayDelta = delta;
  if (delta && !String(delta).startsWith('+') && !String(delta).startsWith('-')) {
    if (tone === 'positive') displayDelta = `+${delta}`;
    else if (tone === 'negative') displayDelta = `-${delta}`;
  }

  const content = (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      <span className="text-sm font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-lg font-bold text-[var(--color-text-primary)]">
        {value}
      </span>
      {displayDelta && (
        <span
          className={`text-sm font-semibold ${tone !== 'confidence' ? deltaColorClass : ''}`}
          style={tone === 'confidence' ? { color: confidenceBarStyle(value).background } : undefined}
        >
          {displayDelta}
        </span>
      )}
    </div>
  );

  if (explanation) {
    // Tooltip from brief 05 is confirmed merged and present in the index.
    return (
      <Tooltip content={explanation}>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default MetricStrip;
