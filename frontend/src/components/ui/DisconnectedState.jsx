export default function DisconnectedState({
  eyebrow,
  title,
  message,
  ctaLabel = 'Connect a platform',
  ctaHref = '/account',
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">{eyebrow}</p>
      )}
      {title && <p className="mt-3 text-lg font-semibold text-white">{title}</p>}
      {message && <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>}
      <a
        className="mt-6 inline-flex items-center rounded-md bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
        href={ctaHref}
      >
        {ctaLabel} →
      </a>
    </div>
  );
}
