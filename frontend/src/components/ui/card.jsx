import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Locked grammar — component-lock-v1.md §4. variant/tone are the only knobs.
const cardVariants = cva('rounded-lg text-[var(--color-text-primary)]', {
  variants: {
    variant: {
      solid: 'bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]',
      outlined: 'bg-transparent border border-[var(--color-border)]',
      empty: 'bg-transparent border border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)]',
      error: 'bg-[color-mix(in_srgb,var(--color-risk-high)_14%,transparent)] border border-[var(--color-risk-high)]',
      preview: 'bg-transparent border border-[var(--color-border)]',
    },
    tone: {
      neutral: '',
      omen: 'ring-1 ring-inset ring-[var(--color-omen)]/30',
      risk: 'ring-1 ring-inset ring-[var(--color-risk-high)]/30',
    },
  },
  defaultVariants: {
    variant: 'solid',
    tone: 'neutral',
  },
});

const Card = React.forwardRef(({ className, variant, tone, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, tone }), className)} {...props} />
));
Card.displayName = 'Card';

// 24px sides/top/bottom, 16px header→body gap per component-lock-v1.md §6.
const CardHeader = React.forwardRef(({ className, eyebrow, title, trailing, children, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-start justify-between gap-3 p-6 pb-4', className)} {...props}>
    <div className="flex flex-col gap-1">
      {eyebrow && (
        <span className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          {eyebrow}
        </span>
      )}
      {title && <h2 className="font-sans text-xl font-semibold leading-tight">{title}</h2>}
      {children}
    </div>
    {trailing && <div className="shrink-0">{trailing}</div>}
  </div>
));
CardHeader.displayName = 'CardHeader';

const CardBody = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 pb-6 text-sm text-[var(--color-text-primary)]', className)} {...props} />
));
CardBody.displayName = 'CardBody';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center gap-3 px-6 pb-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

// Convenience: Card variant="error" bodies always carry a canonical retry action.
const CardRetryAction = React.forwardRef(({ onClick, children = 'Try again', ...props }, ref) => (
  <Button ref={ref} variant="secondary" size="sm" onClick={onClick} {...props}>
    {children}
  </Button>
));
CardRetryAction.displayName = 'CardRetryAction';

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.RetryAction = CardRetryAction;

export { Card, CardHeader, CardBody, CardFooter, CardRetryAction, cardVariants };
