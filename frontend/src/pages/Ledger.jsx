import AppLayout from '../components/layout/AppLayout.jsx';
import MoveHistory from '../components/moves/MoveHistory.jsx';

export default function Ledger() {
  return (
    <AppLayout>
      {/* Page header */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--color-team-accent)' }}
        >
          The Ledger
        </p>
        <h1
          className="mt-3 font-display text-3xl font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Season Record
        </h1>
        <p
          className="mt-2 max-w-xl text-sm leading-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Every move Corvus called. Whether you followed it. Whether it worked.
        </p>
      </div>

      {/* Move history — handles loading, error, empty, and populated states */}
      <MoveHistory />
    </AppLayout>
  );
}
