import Header from './Header.jsx';
import Footer from './Footer.jsx';

export default function PublicInfoLayout({ eyebrow, title, updatedAt, children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {updatedAt && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Last updated {updatedAt}</p>}
        <div className="mt-10 space-y-9 text-sm leading-7 text-[var(--color-text-secondary)]">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

export function InfoSection({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}
