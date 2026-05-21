import Footer from './Footer.jsx';
import Header from './Header.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
