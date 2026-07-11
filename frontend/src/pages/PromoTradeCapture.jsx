import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Scale, ShieldCheck, TrendingUp } from 'lucide-react';
import MockBanner from '../components/ui/MockBanner.jsx';
import { Button, Card, Chip, PageHero } from '../components/ui/index.js';
import { setDataMode } from '../lib/dataMode.js';
import TradeAnalyzer from './TradeAnalyzer.jsx';

const sendPlayer = {
  name: 'Trent Holloway',
  position: 'WR',
  team: 'CHI',
  projected_points: '13.8',
  status: '',
};

const receivePlayer = {
  name: 'Marquise Vale',
  position: 'WR',
  team: 'DAL',
  projected_points: '17.9',
  status: '',
};

const emptyReceive = {
  name: '',
  position: 'WR',
  team: '',
  projected_points: '',
  status: '',
};

const mockResult = {
  verdict: 'accept',
  net_value: 4.2,
  confidence: 'Strong lean',
  explanation:
    'Omen prefers the Marquise Vale side in this sample trade because the weekly upside and role stability are stronger.',
  send: {
    total_value: 11.6,
    players: [{ name: 'Trent Holloway', value: 11.6 }],
  },
  receive: {
    total_value: 15.8,
    players: [{ name: 'Marquise Vale', value: 15.8 }],
  },
};

function stageConfig(stage) {
  if (stage === 'result') {
    return {
      send: [sendPlayer],
      receive: [receivePlayer],
      result: mockResult,
    };
  }

  if (stage === 'receive') {
    return {
      send: [sendPlayer],
      receive: [receivePlayer],
      result: null,
    };
  }

  if (stage === 'send') {
    return {
      send: [sendPlayer],
      receive: [emptyReceive],
      result: null,
    };
  }

  return {
    send: [{ name: '', position: 'WR', team: '', projected_points: '', status: '' }],
    receive: [emptyReceive],
    result: null,
  };
}

export default function PromoTradeCapture() {
  const [params] = useSearchParams();
  const stage = params.get('stage') || 'open';
  const config = stageConfig(stage);

  useEffect(() => {
    setDataMode('mock');
    return () => setDataMode(null);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <PageHero
            className="pb-0"
            eyebrow="TRADE ANALYZER"
            title="Test the trade before you send it."
            subtitle="Build both sides, compare the value, and see whether the deal helps your roster."
            trailing={<Chip variant="preview">Preview</Chip>}
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/trade">
                Open Trade Analyzer
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/demo">See weekly Omen</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Card variant="outlined">
            <Card.Body className="flex items-start gap-3 pt-6">
              <Scale className="mt-0.5 size-5 text-[var(--color-accent)]" aria-hidden="true" />
              <div>
                <p className="font-sans text-sm font-semibold">Both sides weighed</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Send and receive stay readable at a glance.</p>
              </div>
            </Card.Body>
          </Card>
          <Card variant="outlined">
            <Card.Body className="flex items-start gap-3 pt-6">
              <TrendingUp className="mt-0.5 size-5 text-[var(--color-accent)]" aria-hidden="true" />
              <div>
                <p className="font-sans text-sm font-semibold">Value delta clear</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">The result shows the side Omen prefers.</p>
              </div>
            </Card.Body>
          </Card>
          <Card variant="outlined">
            <Card.Body className="flex items-start gap-3 pt-6">
              <ShieldCheck className="mt-0.5 size-5 text-[var(--color-accent)]" aria-hidden="true" />
              <div>
                <p className="font-sans text-sm font-semibold">No league leak</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Preview trades use sample data only.</p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <MockBanner message="Sample trade data for preview only." />
        <TradeAnalyzer
          compact
          initialSend={config.send}
          initialReceive={config.receive}
          initialResult={config.result}
          mockCompareResult={mockResult}
          showShare={false}
          showSidebar={false}
        />
      </section>
    </div>
  );
}
