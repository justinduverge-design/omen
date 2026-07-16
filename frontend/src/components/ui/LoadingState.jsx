import React from 'react';
import Spinner from './Spinner';

export default function LoadingState({ variant = 'spinner', rows = 3 }) {
  if (variant === 'skeleton') {
    return (
      <div role="status" aria-live="polite" className="flex w-full flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-xl motion-reduce:animate-none"
            style={{ backgroundColor: 'var(--color-surface-2)' }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center p-8">
      <Spinner className="h-8 w-8" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
