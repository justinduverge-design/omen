import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

// Locked grammar — Blueprints/specs/design/component-lock-v1.md §1.
// variant/size/tone are the only knobs. No new variants without a doc update.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'text-[var(--tone-on)] bg-[var(--tone-color)] hover:bg-[var(--tone-hover)]',
        secondary:
          'border bg-transparent text-[var(--tone-color)] border-[var(--tone-color)] hover:bg-[var(--tone-color)]/10',
        tertiary: 'bg-transparent text-[var(--tone-color)] hover:bg-[var(--tone-color)]/10',
        danger: 'bg-[var(--color-risk-high)] text-[var(--color-text-primary)] hover:opacity-90',
        link: 'bg-transparent h-auto p-0 text-[var(--tone-color)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-7 px-3 text-sm [&_svg]:size-3.5',
        md: 'h-9 px-4 text-sm [&_svg]:size-4',
        lg: 'h-11 px-6 text-base [&_svg]:size-5',
      },
      tone: {
        accent: '',
        omen: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      tone: 'accent',
    },
  },
);

const TONE_VARS = {
  accent: {
    '--tone-color': 'var(--color-accent)',
    '--tone-hover': 'var(--color-accent-hover)',
    '--tone-on': 'var(--color-text-on-accent)',
  },
  omen: {
    '--tone-color': 'var(--color-omen)',
    '--tone-hover': 'var(--color-omen)',
    '--tone-on': 'var(--color-text-primary)',
  },
};

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      tone = 'accent',
      leadingIcon,
      trailingIcon,
      loading = false,
      disabled = false,
      asChild = false,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, tone }), className)}
        style={{ ...TONE_VARS[tone], ...style }}
        {...props}
      >
        {!loading && leadingIcon}
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
        {!loading && trailingIcon}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
