import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '@/lib/utils';

// Sibling of SegmentedControl — component-lock-v1.md §3.1. High-value one-of-N
// choices where each option needs a title + description. Never a plain toggle.
const RadioCardGroup = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-3', className)} {...props} />
));
RadioCardGroup.displayName = 'RadioCardGroup';

const RadioCardGroupItem = React.forwardRef(
  ({ className, title, description, value, ...props }, ref) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] data-[state=checked]:border-[var(--color-accent)] data-[state=checked]:bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface-1))]',
        className,
      )}
      {...props}
    >
      <span className="font-sans text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
      {description && (
        <span className="text-xs text-[var(--color-text-secondary)]">{description}</span>
      )}
    </RadioGroupPrimitive.Item>
  ),
);
RadioCardGroupItem.displayName = 'RadioCardGroupItem';

RadioCardGroup.Item = RadioCardGroupItem;

export { RadioCardGroup, RadioCardGroupItem };
