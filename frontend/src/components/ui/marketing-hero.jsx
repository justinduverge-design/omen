import * as React from 'react';

import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';

// Marketing-only hero (Landing) — component-lock-v1.md §5. Distinct shape from
// PageHero: centered, uses the `display` role (one per page max), can carry a CTA.
const MarketingHero = React.forwardRef(
  ({ className, eyebrow, title, subtitle, actions, ...props }, ref) => (
    <div
      ref={ref}
      data-motif-target="page-edge"
      className={cn('flex flex-col items-center gap-5 py-16 text-center', className)}
      {...props}
    >
      {eyebrow && (
        <Text as="span" role="eyebrow" className="text-[var(--color-text-secondary)]">
          {eyebrow}
        </Text>
      )}
      <Text as="h1" role="display" className="max-w-3xl">
        {title}
      </Text>
      {subtitle && (
        <Text as="p" role="body" className="max-w-xl text-[var(--color-text-secondary)]">
          {subtitle}
        </Text>
      )}
      {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  ),
);
MarketingHero.displayName = 'MarketingHero';

export { MarketingHero };
