import React from 'react';

const PLATFORM_LABELS = {
  yahoo: 'Yahoo',
  sleeper: 'Sleeper',
  espn: 'ESPN',
};

const PLATFORM_MONOGRAMS = {
  yahoo: 'Y',
  sleeper: 'S',
  espn: 'E',
};

const PlatformBadge = React.forwardRef(function PlatformBadge({
  platform,
  size = 'md',
  showLabel = true,
  className = '',
  ...props
}, ref) {
  if (!['yahoo', 'sleeper', 'espn'].includes(platform)) {
    return null; // Invalid platform, strict enforcement per brief
  }

  const iconSizeClasses = size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs';
  const labelTextSizeClasses = size === 'sm' ? 'text-xs' : 'text-sm';
  const gapClasses = size === 'sm' ? 'gap-1.5' : 'gap-2';

  // Base icon color tokens
  const bgToken = `var(--color-platform-${platform})`;
  const iconTextToken = `var(--color-on-platform-${platform})`;

  // For text on neutral surface, use -chip token if it exists (Yahoo/ESPN),
  // otherwise fallback to base platform color (Sleeper)
  const hasChipToken = platform === 'yahoo' || platform === 'espn';
  const labelColorToken = hasChipToken
    ? `var(--color-platform-${platform}-chip)`
    : `var(--color-platform-${platform})`;

  const label = PLATFORM_LABELS[platform];

  // If showLabel is false, the wrapper itself must carry the aria-label
  const ariaProps = !showLabel ? { 'aria-label': label } : {};

  return (
    <div
      ref={ref}
      className={`inline-flex items-center ${gapClasses} ${className}`.trim().replace(/\s+/g, ' ')}
      {...ariaProps}
      {...props}
    >
      {/* Icon fallback container */}
      <div
        className={`flex items-center justify-center rounded shrink-0 font-bold ${iconSizeClasses}`}
        style={{
          backgroundColor: bgToken,
          color: iconTextToken,
        }}
        aria-hidden="true"
      >
        {PLATFORM_MONOGRAMS[platform]}
      </div>

      {/* Label text */}
      {showLabel && (
        <span
          className={`font-medium ${labelTextSizeClasses}`}
          style={{ color: labelColorToken }}
        >
          {label}
        </span>
      )}
    </div>
  );
});

export default PlatformBadge;
