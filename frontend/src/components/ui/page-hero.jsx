import * as React from 'react';

import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';

// Canonical product-page hero — component-lock-v1.md §5. Every product page
// uses this instead of an ad-hoc header block.
const PageHero = React.forwardRef(({ className, eyebrow, title, subtitle, trailing, ...props }, ref) => (
  <div
    ref={ref}
    data-motif-target="page-edge"
    className={cn('flex flex-col gap-3 pb-8', className)}
    {...props}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-3">
        {eyebrow && (
          <Text as="span" role="eyebrow" className="text-[var(--color-text-secondary)]">
            {eyebrow}
          </Text>
        )}
        <Text as="h1" role="h1">
          {title}
        </Text>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
    {subtitle && (
      <Text as="p" role="body" className="max-w-2xl text-[var(--color-text-secondary)]">
        {subtitle}
      </Text>
    )}
  </div>
));
PageHero.displayName = 'PageHero';

export { PageHero };
