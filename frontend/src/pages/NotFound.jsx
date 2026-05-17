import { Link } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">
          Page not found
        </p>
        <h1 className="mt-5 text-4xl font-semibold text-white">
          This route is not in Corvus yet.
        </h1>
        <p className="mt-6 text-slate-300">
          Return to the app shell while the platform map is still being built.
        </p>
        <Link className="mt-8 inline-flex text-sm font-semibold text-amber-300" to="/">
          Back to Corvus
        </Link>
      </main>
      <Footer />
    </div>
  );
}
