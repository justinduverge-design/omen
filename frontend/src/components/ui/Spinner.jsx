export default function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin motion-reduce:hidden rounded-full border-2 ${className}`}
      style={{ borderColor: 'var(--color-surface-3)', borderTopColor: 'var(--color-accent)' }}
    />
  );
}
