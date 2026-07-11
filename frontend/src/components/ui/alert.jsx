import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Sibling of Card — component-lock-v1.md §4.1. Same tone tokens as Card.
const alertVariants = cva(
  'relative flex w-full items-start gap-3 rounded-lg border p-4 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-[var(--color-surface-1)] border-[var(--color-border)] text-[var(--color-text-primary)]',
        omen: 'bg-[color-mix(in_srgb,var(--color-omen)_12%,transparent)] border-[var(--color-omen)] text-[var(--color-text-primary)]',
        risk: 'bg-[color-mix(in_srgb,var(--color-risk-high)_12%,transparent)] border-[var(--color-risk-high)] text-[var(--color-text-primary)]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

const Alert = React.forwardRef(({ className, tone, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ tone }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn('font-sans font-semibold leading-none', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-[var(--color-text-secondary)] [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
