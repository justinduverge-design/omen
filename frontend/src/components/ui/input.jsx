import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Locked grammar — component-lock-v1.md §2. type/size/state are the only knobs.
const inputVariants = cva(
  'flex w-full rounded-md border bg-[var(--color-surface-1)] px-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
      state: {
        default: 'border-[var(--color-border)] hover:border-[var(--color-border-hover,var(--color-border))] focus-visible:ring-[var(--color-focus-ring)]',
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

const Input = React.forwardRef(
  ({ className, type = 'text', size, state, leadingIcon, trailingIcon, ...props }, ref) => {
    if (!leadingIcon && !trailingIcon) {
      return (
        <input
          type={type}
          className={cn(inputVariants({ size, state }), className)}
          ref={ref}
          {...props}
        />
      );
    }
    return (
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 flex text-[var(--color-text-secondary)] [&_svg]:size-4">
            {leadingIcon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ size, state }),
            leadingIcon && 'pl-9',
            trailingIcon && 'pr-9',
            className,
          )}
          ref={ref}
          {...props}
        />
        {trailingIcon && (
          <span className="pointer-events-none absolute right-3 flex text-[var(--color-text-secondary)] [&_svg]:size-4">
            {trailingIcon}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
