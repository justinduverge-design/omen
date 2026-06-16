export default function Footer() {
  return (
    <footer
      className="border-t"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <span
          className="font-display text-sm uppercase tracking-[0.2em]"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Corvus
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          &copy; {new Date().getFullYear()} Slops Saloon. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
