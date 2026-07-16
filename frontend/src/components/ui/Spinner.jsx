export default function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 motion-reduce:animate-none ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        borderTopColor: 'var(--color-accent)',
      }}
    />
  );
}
