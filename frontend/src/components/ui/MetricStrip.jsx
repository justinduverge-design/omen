import React from 'react';
import Tooltip from './Tooltip';
import { confidenceBarStyle } from '../../lib/confidenceGradient';

const MetricStrip = ({
  label,
  value,
  delta,
  tone,
  explanation,
  confidenceScore,
  className = '',
  ...props
}) => {
  const deltaStr = delta !== undefined && delta !== null ? String(delta).trim() : '';
  const hasExplicitSign = /^[+\-↑↓]/.test(deltaStr);

  let deltaColor = 'var(--color-text-secondary)';
  let DeltaIcon = null;

  if (tone === 'positive') {
    deltaColor = 'var(--color-risk-low)';
    if (!hasExplicitSign) {
      DeltaIcon = (
        <span aria-hidden="true" className="mr-0.5 text-[0.85em] leading-none">+</span>
      );
    }
  } else if (tone === 'negative') {
    deltaColor = 'var(--color-risk-high)';
    if (!hasExplicitSign) {
      DeltaIcon = (
        <span aria-hidden="true" className="mr-0.5 text-[0.85em] leading-none">-</span>
      );
    }
  } else if (tone === 'neutral') {
    deltaColor = 'var(--color-text-secondary)';
    DeltaIcon = null;
  }

  let valueStyle = { color: 'var(--color-text-primary)' };
  let valueClasses = "font-mono font-semibold text-base"; // slightly smaller than text-lg for normal use

  if (confidenceScore !== undefined && confidenceScore !== null) {
    const { background } = confidenceBarStyle(confidenceScore);
    // Since background is a CSS color-mix (which is valid for background, but typically used there),
    // we should apply it safely. color-mix can actually be used directly in color.
    valueStyle = { color: background };
  }

  const labelEl = (
    <span className="text-xs uppercase tracking-widest font-semibold text-[var(--color-text-tertiary)] flex items-center gap-1.5">
      {label}
      {explanation && (
        <span className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none motion-reduce:duration-0 cursor-help inline-flex items-center">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </span>
      )}
    </span>
  );

  return (
    <div
      className={`flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0 ${className}`}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        {explanation ? (
          <Tooltip content={explanation} side="top">
            <button
              type="button"
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] rounded-sm appearance-none bg-transparent border-none p-0 m-0"
              aria-label={`${label} explanation`}
            >
               {labelEl}
            </button>
          </Tooltip>
        ) : (
          labelEl
        )}
      </div>

      <div className="flex items-baseline gap-3">
        {value !== undefined && value !== null && (
          <span className={valueClasses} style={valueStyle}>
            {value}
          </span>
        )}

        {deltaStr !== '' && (
          <span
            className="flex items-center font-mono text-sm font-semibold"
            style={{ color: deltaColor }}
          >
            {DeltaIcon}
            <span>{deltaStr}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricStrip;
