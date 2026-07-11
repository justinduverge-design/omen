import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Sibling of Input — component-lock-v1.md §2. Same size/state grammar.
const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border bg-[var(--color-surface-1)] px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'text-sm',
        md: 'text-sm',
        lg: 'text-base',
      },
      state: {
        default: 'border-[var(--color-border)] focus-visible:ring-[var(--color-focus-ring)]',
        error: 'border-[var(--color-risk-high)] focus-visible:ring-[var(--color-risk-high)]',
        success: 'border-[var(--color-risk-low)] focus-visible:ring-[var(--color-risk-low)]',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  },
);

const Textarea = React.forwardRef(({ className, size, state, ...props }, ref) => (
  <textarea className={cn(textareaVariants({ size, state }), className)} ref={ref} {...props} />
));
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
