import HelpButton from '../ui/HelpButton.jsx';
import Footer from './Footer.jsx';
import Header from './Header.jsx';

export default function AppLayout({ children }) {
  return (
    <div
      data-motif-target="page-edge"
      className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
    >
      <Header />
      <main
        data-motif-target="section-divider"
        className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10"
      >
        {children}
      </main>
      <Footer />
      <HelpButton />
    </div>
  );
}
