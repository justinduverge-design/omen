export default function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-slate-700 border-t-amber-400 ${className}`}
    />
  );
}
