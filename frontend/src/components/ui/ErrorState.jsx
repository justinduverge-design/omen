import { Card } from './Card.jsx';

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <Card variant="error" className="p-6">
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      {message && <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>}
      {onRetry && (
        <button
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--color-risk-high) 20%, transparent)',
            color: 'var(--color-text-primary)',
          }}
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </Card>
  );
}
