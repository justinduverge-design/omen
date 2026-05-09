import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          className="text-sm font-semibold tracking-wide text-white"
          to="/"
        >
          Slops Saloon
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-5 text-sm">
          <Link
            className="text-slate-300 transition-colors hover:text-white"
            to="/football"
          >
            Trade Analyzer
          </Link>
          <a
            className="text-slate-300 transition-colors hover:text-white"
            href="/football"
          >
            Football
          </a>
        </nav>
      </div>
    </header>
  );
}
