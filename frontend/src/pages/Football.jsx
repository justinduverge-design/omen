import { useState } from 'react';
import StartSit from './StartSit';
import TradeAnalyzer from './TradeAnalyzer';

const TABS = [
  { id: 'trade', label: 'Trade Analyzer', disabled: false },
  { id: 'start-sit', label: 'Start/Sit', disabled: false },
];

export default function Football() {
  const [activeTab, setActiveTab] = useState('trade');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Slops Saloon Football
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
            Football
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Trade analysis, lineup decisions, and waiver intelligence grounded
            in defensible math.
          </p>
        </section>

        <div className="flex flex-wrap gap-2 border-b border-slate-800">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={[
                  'border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400',
                  tab.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:border-slate-600 hover:text-white',
                ].join(' ')}
                disabled={tab.disabled}
                type="button"
                onClick={tab.disabled ? undefined : () => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <section>
          {activeTab === 'trade' ? <TradeAnalyzer /> : null}
          {activeTab === 'start-sit' ? <StartSit /> : null}
        </section>
      </main>
    </div>
  );
}
