import React from 'react';
import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div
      className="rounded-xl border p-6"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-risk-high) 30%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--color-risk-high) 10%, transparent)',
      }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </p>
      {message && (
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
