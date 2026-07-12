export default function MockBanner({ message = 'Preview Mode — mock data. Live data connects to your actual roster when the season begins.' }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-xs"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-data-mock) 30%, transparent)',
        background: 'color-mix(in srgb, var(--color-data-mock) 12%, transparent)',
        color: 'var(--color-data-mock)',
      }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 flex-shrink-0 animate-pulse motion-reduce:animate-none rounded-full"
        style={{ background: 'var(--color-data-mock)' }}
      />
      {message}
    </div>
  );
}
