import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

// Sibling of SegmentedControl — component-lock-v1.md §3.1. View-switching only,
// never form input. Underline-tab chrome, backed by the same Tabs primitive.
const TabNav = TabsPrimitive.Root;

const TabNavList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex items-center gap-6 border-b border-[var(--color-border)]', className)}
    {...props}
  />
));
TabNavList.displayName = 'TabNavList';

const TabNavItem = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative -mb-px inline-flex h-11 items-center border-b-2 border-transparent px-1 font-sans text-sm font-medium text-[var(--color-text-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-text-primary)]',
      className,
    )}
    {...props}
  />
));
TabNavItem.displayName = 'TabNavItem';

const TabNavContent = TabsPrimitive.Content;

function TabNavRoot({ className, children, ...props }) {
  return (
    <TabNav className={className} {...props}>
      <TabNavList>{children}</TabNavList>
    </TabNav>
  );
}
TabNavRoot.Item = TabNavItem;
TabNavRoot.Content = TabNavContent;

export { TabNavRoot as TabNav, TabNavList, TabNavItem, TabNavContent };
