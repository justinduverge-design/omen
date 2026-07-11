import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout.jsx';
import MoveHistory from '../components/moves/MoveHistory.jsx';
import { PageHero } from '../components/ui/index.js';
import { setDataMode } from '../lib/dataMode.js';
import { PRIVATE_FIXTURE_KEYS, isPrivateFixtureEnabled } from '../lib/privateFixtureMode.js';

export default function Ledger() {
  const fixtureActive = isPrivateFixtureEnabled(PRIVATE_FIXTURE_KEYS.PREVIOUS_RESULTS);
  const [fixture, setFixture] = useState(null);

  // Reset to fail-closed when leaving the page; MoveHistory drives live/mock
  // while mounted via onDataState.
  useEffect(() => () => setDataMode(null), []);

  useEffect(() => {
    if (!fixtureActive) {
      setFixture(null);
      return undefined;
    }

    setDataMode('mock');
    let mounted = true;
    if (import.meta.env.DEV) {
      import('../data/privateDemoFixtures.js')
        .then(({ LEDGER_PREVIOUS_RESULTS_FIXTURE }) => {
          if (mounted) setFixture(LEDGER_PREVIOUS_RESULTS_FIXTURE);
        });
    }
    return () => {
      mounted = false;
    };
  }, [fixtureActive]);
  return (
    <AppLayout>
      <PageHero
        eyebrow="THE LEDGER"
        title="Your Season Record"
        subtitle="Every move Omen called. Whether you followed it. Whether it worked."
      />

      {/* Move history — handles loading, error, empty, and populated states */}
      {fixtureActive && !fixture ? (
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl" style={{ background: 'var(--color-surface-2)' }} />
      ) : (
        <MoveHistory
          fixture={fixtureActive ? fixture : null}
          onDataState={setDataMode}
        />
      )}
    </AppLayout>
  );
}
