import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-sans text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--color-accent)] text-[var(--color-text-on-accent)]',
        secondary: 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]',
        outline: 'border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)]',
        // Chip subclass — component-lock-v1.md doctrine-audit note.
        chant: 'border-transparent bg-[color-mix(in_srgb,var(--color-team-primary)_16%,transparent)] font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--color-team-primary)]',
        preview: 'rounded-full border-[var(--color-border)] bg-transparent font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--color-text-secondary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Chip = Badge, restricted to the chant/preview sub-variants (doctrine-audit §H1).
function Chip({ className, variant = 'chant', ...props }) {
  return <Badge className={className} variant={variant} {...props} />;
}

export { Badge, Chip, badgeVariants };
