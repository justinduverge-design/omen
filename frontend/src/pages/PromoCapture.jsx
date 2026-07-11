import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gauge, ShieldCheck, Sparkles } from 'lucide-react';
import MockBanner from '../components/ui/MockBanner.jsx';
import { Button, Card, Chip, PageHero } from '../components/ui/index.js';
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
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <PageHero
            className="pb-0"
            eyebrow="OMEN PREVIEW"
            title="See the move before your league does."
            subtitle="Omen turns roster context into a clear weekly call: the move, the confidence, and the risk."
            trailing={<Chip variant="preview">Sample</Chip>}
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/demo">
                Try the demo
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/trade">Run a trade check</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Card variant="outlined">
            <Card.Body className="flex items-start gap-3 pt-6">
              <Sparkles className="mt-0.5 size-5 text-[var(--color-accent)]" aria-hidden="true" />
              <div>
                <p className="font-sans text-sm font-semibold">Move first</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">The recommendation leads. The explanation follows.</p>
              </div>
            </Card.Body>
          </Card>
          <Card variant="outlined">
            <Card.Body className="flex items-start gap-3 pt-6">
              <Gauge className="mt-0.5 size-5 text-[var(--color-accent)]" aria-hidden="true" />
              <div>
                <p className="font-sans text-sm font-semibold">Confidence visible</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">No hidden score. The call shows its strength.</p>
              </div>
            </Card.Body>
          </Card>
          <Card variant="outlined">
            <Card.Body className="flex items-start gap-3 pt-6">
              <ShieldCheck className="mt-0.5 size-5 text-[var(--color-accent)]" aria-hidden="true" />
              <div>
                <p className="font-sans text-sm font-semibold">Risk included</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">A good call still shows what can break it.</p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <MockBanner message="Sample data. Connect a league to generate live recommendations." />
        <OmenRecommendationView
          data={promoOmenData}
          showFeedback={false}
        />
      </section>
    </div>
  );
}
