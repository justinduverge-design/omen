import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Locked grammar — component-lock-v1.md §3. Filled-pill, one pattern only.
const listSizeVariants = cva('inline-flex items-center gap-1 rounded-md p-1', {
  variants: {
    size: {
      sm: 'h-7',
      md: 'h-9',
      lg: 'h-11',
    },
  },
  defaultVariants: { size: 'md' },
});

const triggerSizeVariants = cva(
  'inline-flex items-center justify-center rounded-[calc(var(--radius)-4px)] border border-[var(--color-border)] px-3 font-sans font-medium text-[var(--color-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] data-[state=active]:border-transparent data-[state=active]:bg-[var(--color-accent)] data-[state=active]:text-[var(--color-text-on-accent)]',
  {
    variants: {
      size: {
        sm: 'h-7 text-xs',
        md: 'h-9 text-sm',
        lg: 'h-11 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

const SegmentedControl = TabsPrimitive.Root;

const SegmentedControlList = React.forwardRef(({ className, size, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn(listSizeVariants({ size }), className)} {...props} />
));
SegmentedControlList.displayName = 'SegmentedControlList';

const SegmentedControlItem = React.forwardRef(({ className, size, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn(triggerSizeVariants({ size }), className)} {...props} />
));
SegmentedControlItem.displayName = 'SegmentedControlItem';

// Sugar API matching component-lock-v1.md §3: <SegmentedControl size="md"><SegmentedControl.Item .../></SegmentedControl>
function SegmentedControlRoot({ size = 'md', className, children, ...props }) {
  return (
    <SegmentedControl className={className} {...props}>
      <SegmentedControlList size={size}>
        {React.Children.map(children, (child) =>
          React.isValidElement(child) ? React.cloneElement(child, { size }) : child,
        )}
      </SegmentedControlList>
    </SegmentedControl>
  );
}
function SegmentedControlItemSugar({ size, ...props }) {
  return <SegmentedControlItem size={size} {...props} />;
}
SegmentedControlRoot.Item = SegmentedControlItemSugar;

export {
  SegmentedControlRoot as SegmentedControl,
  SegmentedControlList,
  SegmentedControlItem,
};
