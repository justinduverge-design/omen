import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Locked type scale — component-lock-v1.md §5. Font stack per Justin
// 2026-07-10: Alegreya (serif, headings) + Alegreya Sans (everything else).
// No DM Mono / Cinzel / Inter — role differentiation comes from weight,
// tracking, and case, not a third face.
const DEFAULT_TAG = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  'body-sm': 'p',
  label: 'span',
  eyebrow: 'span',
  chip: 'span',
};

const textVariants = cva('', {
  variants: {
    role: {
      display: 'font-serif text-5xl leading-[1.15] font-bold tracking-normal',
      h1: 'font-serif text-3xl leading-[1.25] font-bold tracking-normal',
      h2: 'font-sans text-xl leading-[1.4] font-semibold tracking-normal',
      h3: 'font-sans text-base leading-[1.5] font-semibold tracking-normal',
      body: 'font-sans text-[15px] leading-[1.6] font-normal tracking-normal',
      'body-sm': 'font-sans text-[13px] leading-[1.55] font-normal tracking-normal',
      label: 'font-sans text-xs leading-4 font-medium tracking-[0.05em]',
      eyebrow: 'font-sans text-xs leading-4 font-semibold uppercase tracking-[0.12em]',
      chip: 'font-sans text-[11px] leading-[14px] font-semibold uppercase tracking-[0.10em]',
    },
  },
  defaultVariants: {
    role: 'body',
  },
});

const Text = React.forwardRef(({ as, role = 'body', className, ...props }, ref) => {
  const Comp = as || DEFAULT_TAG[role] || 'span';
  return <Comp ref={ref} className={cn(textVariants({ role }), className)} {...props} />;
});
Text.displayName = 'Text';

export { Text, textVariants };
