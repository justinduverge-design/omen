export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-white">Slops Saloon</span>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Slops OS. Built for careful
            decisions.
          </span>
          <span className="text-xs text-slate-700">
            Community links will appear when they are live.
          </span>
        </div>
      </div>
    </footer>
  );
}
