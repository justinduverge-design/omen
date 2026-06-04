import { Link } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

export default function NotFound() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
          Page not found
        </p>
        <h1 className="mt-5 text-4xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          This route is not in Corvus yet.
        </h1>
        <p className="mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          Return to the app shell while the platform map is still being built.
        </p>
        <Link
          className="mt-8 inline-flex min-h-[44px] items-center text-sm font-semibold"
          style={{ color: 'var(--color-accent)' }}
          to="/"
        >
          Back to Corvus
        </Link>
      </main>
      <Footer />
    </div>
  );
}
