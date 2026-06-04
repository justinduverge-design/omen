export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6">
      <p className="text-sm font-semibold text-red-300">{title}</p>
      {message && <p className="mt-1 text-sm text-red-200/70">{message}</p>}
      {onRetry && (
        <button
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-red-400/20 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-400/30"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}
