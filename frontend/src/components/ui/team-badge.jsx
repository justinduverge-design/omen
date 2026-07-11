import * as React from 'react';

import { cn } from '@/lib/utils';

// team-theme-contract-v1.md §"Where team color IS allowed to show up" —
// colored square, team abbrev, subtle bottom stripe. Reads --color-team-primary
// / --color-team-secondary directly, independent of Switch A/accent fallback.
const TeamBadge = React.forwardRef(({ className, team, size = 'md', ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'relative inline-flex items-center justify-center overflow-hidden rounded-md font-sans font-bold uppercase',
      size === 'sm' && 'h-6 w-6 text-[10px]',
      size === 'md' && 'h-8 w-8 text-xs',
      size === 'lg' && 'h-11 w-11 text-sm',
      className,
    )}
    style={{
      backgroundColor: 'var(--color-team-primary)',
      color: 'var(--color-text-primary)',
    }}
    {...props}
  >
    {team}
    <span
      className="absolute inset-x-0 bottom-0 h-[3px]"
      style={{ backgroundColor: 'var(--color-team-secondary)' }}
      aria-hidden="true"
    />
  </span>
));
TeamBadge.displayName = 'TeamBadge';

export { TeamBadge };
