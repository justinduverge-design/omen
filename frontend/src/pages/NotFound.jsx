import { Link } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import { Button, PageHero } from '../components/ui/index.js';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <PageHero
          eyebrow="PAGE NOT FOUND"
          title="This route is not in Omen yet."
          subtitle="Return to the app shell while the platform map is still being built."
        />
        <Button variant="link" asChild>
          <Link to="/">Back to Omen</Link>
        </Button>
      </main>
      <Footer />
    </div>
  );
}
