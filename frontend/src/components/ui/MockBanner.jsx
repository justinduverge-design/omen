export default function MockBanner({ message = 'Preview Mode — mock data. Live data connects to your actual roster when the season begins.' }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-md border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5 text-xs text-amber-300">
      <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 animate-pulse motion-reduce:animate-none rounded-full bg-amber-400" />
      {message}
    </div>
  );
}
