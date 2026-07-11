import * as React from 'react';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Wraps Input/Textarea per component-lock-v1.md §2's label/hint/errorMessage props.
const FormField = React.forwardRef(
  ({ className, label, hint, errorMessage, state, htmlFor, children }, ref) => {
    const resolvedState = errorMessage ? 'error' : state;
    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)}>
        {label && (
          <Label htmlFor={htmlFor} className="text-[var(--color-text-primary)] tracking-wide">
            {label}
          </Label>
        )}
        {React.isValidElement(children)
          ? React.cloneElement(children, { id: htmlFor, state: resolvedState })
          : children}
        {errorMessage ? (
          <p className="mt-1 text-xs text-[var(--color-risk-high)]">{errorMessage}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{hint}</p>
        ) : null}
      </div>
    );
  },
);
FormField.displayName = 'FormField';

export { FormField };
