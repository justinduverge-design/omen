import { useEffect } from 'react';
import MockBanner from '../components/ui/MockBanner.jsx';
import { OMEN_VISUAL_FIXTURE } from '../data/privateDemoFixtures.js';
import { setDataMode } from '../lib/dataMode.js';
import { OmenRecommendationView } from './OmenOfTheWeek.jsx';

const promoOmenData = {
  ...OMEN_VISUAL_FIXTURE,
  fixture_key: undefined,
  fixture_label: 'Sample data.',
  contract_version: 'promo-sample.v1',
  warnings: ['Sample data. Connect a league to generate live recommendations.'],
  league: {
    ...OMEN_VISUAL_FIXTURE.league,
    id: 'sample-league',
    name: 'Omen Sample League',
  },
  team: {
    ...OMEN_VISUAL_FIXTURE.team,
    id: 'sample-team',
    name: 'Sunday Signal',
  },
  platform: {
    name: 'sample',
    status: 'preview',
    recovery: null,
  },
  signals: {},
  recommendation: {
    ...OMEN_VISUAL_FIXTURE.recommendation,
    confidence: {
      ...OMEN_VISUAL_FIXTURE.recommendation.confidence,
      rationale: 'Omen sees a clear projected edge in this sample lineup.',
    },
    risk: {
      ...OMEN_VISUAL_FIXTURE.recommendation.risk,
      reasons: [
        'Sample roster data is used for this preview.',
        'Live recommendations can change with injuries, matchups, scoring settings, and roster context.',
      ],
    },
    explanation: {
      summary: 'Start Marquise Vale over Trent Holloway.',
      why_it_matters: 'Vale gives this sample lineup a meaningful projection edge.',
      risk: 'Risk is medium because player availability and matchup context can still move.',
      confidence: 'Confidence is 74 out of 100 for this sample scenario.',
      data_used: ['sample roster', 'sample projections', 'sample matchup context'],
    },
  },
  alternatives: [],
};

export default function PromoCapture() {
  useEffect(() => {
    setDataMode('mock');
    return () => setDataMode(null);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Omen preview
        </p>
        <div className="max-w-3xl space-y-3">
          <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
            See the move before your league does.
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            Omen reads your roster context, weighs the close calls, and gives you
            the recommendation first, with confidence and risk right behind it.
          </p>
        </div>
      </section>

      <OmenRecommendationView
        data={promoOmenData}
        banner={<MockBanner message="Sample data. Connect a league to generate live recommendations." />}
        showFeedback={false}
      />
    </div>
  );
}
