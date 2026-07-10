import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MockBanner from '../components/ui/MockBanner.jsx';
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
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Trade Analyzer
        </p>
        <div className="max-w-3xl space-y-3">
          <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
            Test the trade before you send it.
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            Build both sides, compare the player value, and see the recommendation in one pass.
          </p>
        </div>
        <MockBanner message="Sample trade data for preview only." />
      </section>

      <TradeAnalyzer
        compact
        initialSend={config.send}
        initialReceive={config.receive}
        initialResult={config.result}
        mockCompareResult={mockResult}
        showShare={false}
        showSidebar={false}
      />
    </div>
  );
}
