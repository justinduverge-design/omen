import * as React from 'react';

import { cn } from '@/lib/utils';
import { platformButtonStyle } from '@/lib/platformChip';

const PLATFORM_LABEL = {
  sleeper: 'Sleeper',
  yahoo: 'Yahoo',
  espn: 'ESPN',
};

// Renders per-platform brand tokens (--color-platform-*) directly — these are
// on the team-theme deny list (team-theme-contract-v1.md) and must never be
// tinted by team color. Off the Button chrome per component-lock-v1.md §1.
const PlatformBadge = React.forwardRef(({ className, platform, label, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-sans text-xs font-semibold',
      className,
    )}
    style={platformButtonStyle(platform)}
    {...props}
  >
    {label ?? PLATFORM_LABEL[platform] ?? platform}
  </span>
));
PlatformBadge.displayName = 'PlatformBadge';

export { PlatformBadge };
