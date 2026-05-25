import Footer from './Footer.jsx';
import Header from './Header.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
