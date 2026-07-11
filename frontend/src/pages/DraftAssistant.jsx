import { useEffect, useMemo, useState } from 'react';
import ErrorState from '../components/ui/ErrorState.jsx';
import MockBanner from '../components/ui/MockBanner.jsx';
import { Button, Input, PageHero, SegmentedControl } from '../components/ui/index.js';
import { NFL_TEAMS } from '../data/nflTeams.js';
import { apiFetch } from '../lib/api.js';
import { PRIVATE_FIXTURE_KEYS, isPrivateFixtureEnabled } from '../lib/privateFixtureMode.js';
import { positionChipStyle } from '../lib/positionChip.js';
import { confidenceBarStyle } from '../lib/confidenceGradient.js';
import { metallicTierStyle } from '../lib/metallicTier.js';
import { useTheme } from '../lib/themeMode.js';

const SCORING_FORMATS = [
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'standard', label: 'Standard' },
];

const POSITION_NEEDS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'];

const REC_TYPE_LABELS = {
  best_available: 'Best Available',
  roster_fit: 'Roster Fit',
  value_pick: 'Value Pick',
  risk_adjusted: 'Risk Adjusted',
};

// Build { [playerName]: { ffc, yahoo, mfl } } lookup from ADP response sources
function buildAdpMap(sources) {
  if (!sources) return {};
  const map = {};
  for (const [sourceKey, sourceData] of Object.entries(sources)) {
    for (const player of sourceData?.players ?? []) {
      if (!player.name) continue;
      if (!map[player.name]) map[player.name] = {};
      map[player.name][sourceKey] = player.adp;
    }
  }
  return map;
}

// Return the first connected platform key from the platforms summary object
function getConnectedPlatform(platforms) {
  if (!platforms) return null;
  for (const key of ['yahoo', 'sleeper', 'espn']) {
    if (platforms[key]?.connected) return key;
  }
  return null;
}

function RiskBadge({ risk }) {
  const styles = {
    low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    medium: null,
    high: 'border-red-400/30 bg-red-400/10 text-red-300',
  };
  const colorClass = styles[risk] ?? null;
  const mediumStyle = colorClass === null
    ? { borderColor: 'var(--color-team-accent)', background: 'var(--color-accent-muted)', color: 'var(--color-team-accent)' }
    : undefined;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize${colorClass ? ` ${colorClass}` : ''}`}
      style={mediumStyle}
    >
      {risk} risk
    </span>
  );
}

function PositionBadge({ position }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={positionChipStyle(position)}
    >
      {position}
    </span>
  );
}

function ConfidenceBar({ score }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-surface-1)' }}>
        <div
          className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
          style={confidenceBarStyle(score)}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{score}%</span>
    </div>
  );
}

const ADP_OTHER_SOURCES = [
  { key: 'ffc', label: 'FFC', href: 'https://fantasyfootballcalculator.com' },
  { key: 'yahoo', label: 'Yahoo', href: null },
  { key: 'mfl', label: 'MFL', href: null },
];

function AdpRow({ rec, adpMap, adpLoading, connectedPlatform }) {
  if (adpLoading) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>ADP</p>
        <div className="h-4 w-20 animate-pulse motion-reduce:animate-none rounded" style={{ background: 'var(--color-surface-1)' }} />
        <div className="h-4 w-16 animate-pulse motion-reduce:animate-none rounded" style={{ background: 'var(--color-surface-1)' }} />
      </div>
    );
  }

  if (!adpMap) return null;

  const playerAdp = adpMap[rec.player.name] ?? {};

  // Primary chip: connected platform ADP. Only Yahoo is in the ADP sources.
  const platformAdp = connectedPlatform === 'yahoo' ? (playerAdp.yahoo ?? null) : null;

  // Other sources: FFC, MFL, and Yahoo only if Yahoo isn't the connected platform
  const otherSources = ADP_OTHER_SOURCES
    .filter((s) => !(s.key === 'yahoo' && connectedPlatform === 'yahoo'))
    .filter((s) => playerAdp[s.key] != null);

  const hasAnything = platformAdp != null || otherSources.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>ADP</p>

      {platformAdp != null && (
        <span className="inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-semibold" style={{ borderColor: 'var(--color-team-accent)', background: 'var(--color-accent-muted)', color: 'var(--color-team-accent)' }}>
          Yahoo {platformAdp}
        </span>
      )}

      <span
        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
      >
        Omen #{rec.rank}
      </span>

      {otherSources.length > 0 && (
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {otherSources.map((src, i) => (
            <span key={src.key} className="flex items-center gap-1">
              {i > 0 && <span>·</span>}
              {src.href ? (
                <a
                  className="text-xs underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                  href={src.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {src.label}
                </a>
              ) : (
                <span>{src.label}</span>
              )}
              <span>{playerAdp[src.key]}</span>
            </span>
          ))}
        </span>
      )}

      {!hasAnything && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
    </div>
  );
}

function RecommendationCard({ rec, adpMap, adpLoading, connectedPlatform }) {
  const isTop = rec.rank === 1;
  const tierStyle = metallicTierStyle(rec.rank);
  return (
    <div
      className={`space-y-4 rounded-xl border p-5 ${
        isTop
          ? 'border-[var(--color-team-accent)]/40 bg-[var(--color-team-accent)]/5 shadow-lg shadow-[var(--color-team-accent)]/5'
          : ''
      }`}
      style={isTop ? undefined : { borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
            style={tierStyle ?? { borderColor: 'var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}
          >
            {rec.rank}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{rec.player.name}</p>
              <PositionBadge position={rec.player.position} />
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{rec.player.team}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)' }}>
            {REC_TYPE_LABELS[rec.recommendation_type] ?? rec.recommendation_type}
          </span>
          <RiskBadge risk={rec.risk_level} />
        </div>
      </div>

      <p
        className="font-display text-xl font-semibold leading-snug"
        style={isTop ? { color: 'var(--color-text-primary)' } : { color: 'var(--color-text-primary)' }}
      >
        {rec.headline}
      </p>

      <div>
        <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Confidence</p>
        <ConfidenceBar score={rec.confidence_score} />
      </div>

      {rec.reasoning?.length > 0 && (
        <ol className="space-y-2">
          {rec.reasoning.map((line, i) => (
            <li key={i} className="flex gap-3 text-sm leading-6" style={{ color: 'var(--color-text-primary)' }}>
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold" style={{ borderColor: 'var(--color-team-accent)', background: 'var(--color-accent-muted)', color: 'var(--color-team-accent)' }}>
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
      )}

      <AdpRow
        rec={rec}
        adpMap={adpMap}
        adpLoading={adpLoading}
        connectedPlatform={connectedPlatform}
      />
    </div>
  );
}

function LoadingRecommendations() {
  return (
    <div aria-busy="true" aria-label="Loading recommendations" className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse motion-reduce:animate-none space-y-3 rounded-xl border p-5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full" style={{ background: 'var(--color-surface-2)' }} />
            <div className="h-5 w-36 rounded" style={{ background: 'var(--color-surface-2)' }} />
          </div>
          <div className="h-5 w-3/4 rounded" style={{ background: 'var(--color-surface-2)' }} />
          <div className="h-2 rounded-full" style={{ background: 'var(--color-surface-2)' }} />
          <div className="space-y-2">
            <div className="h-4 w-full rounded" style={{ background: 'var(--color-surface-2)' }} />
            <div className="h-4 w-5/6 rounded" style={{ background: 'var(--color-surface-2)' }} />
            <div className="h-4 w-4/6 rounded" style={{ background: 'var(--color-surface-2)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DraftAssistant({ platforms }) {
  const fixtureActive = isPrivateFixtureEnabled(PRIVATE_FIXTURE_KEYS.MOCK_DRAFT);
  const [scoringFormat, setScoringFormat] = useState('ppr');
  const [draftPosition, setDraftPosition] = useState('5');
  const [round, setRound] = useState('1');
  const [needs, setNeeds] = useState(new Set(['RB', 'WR']));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [adpData, setAdpData] = useState(null);
  const [adpLoading, setAdpLoading] = useState(false);
  const [fixture, setFixture] = useState(null);
  const { mode, team: teamAbbr } = useTheme();

  const cry = useMemo(() => {
    if (mode !== 'team' || !teamAbbr) return null;
    return NFL_TEAMS.find((t) => t.abbr === teamAbbr)?.cry ?? null;
  }, [mode, teamAbbr]);

  const connectedPlatform = getConnectedPlatform(platforms);
  const adpMap = adpData ? buildAdpMap(adpData.sources) : null;

  useEffect(() => {
    if (!fixtureActive) {
      setFixture(null);
      return undefined;
    }

    let mounted = true;
    if (import.meta.env.DEV) {
      import('../data/privateDemoFixtures.js')
        .then(({ DRAFT_ASSISTANT_FIXTURE }) => {
          if (mounted) setFixture(DRAFT_ASSISTANT_FIXTURE);
        });
    }
    return () => {
      mounted = false;
    };
  }, [fixtureActive]);

  useEffect(() => {
    if (!fixtureActive || !fixture) return;

    const { form, result, adp } = fixture;
    setScoringFormat(form.scoring_format);
    setDraftPosition(String(form.draft_position));
    setRound(String(form.round));
    setNeeds(new Set(form.position_needs));
    setResult(result);
    setAdpData(adp);
    setAdpLoading(false);
    setLoading(false);
    setError(null);
    setHasSubmitted(true);
  }, [fixtureActive, fixture]);

  useEffect(() => {
    if (fixtureActive) {
      setAdpData(fixture?.adp ?? null);
      setAdpLoading(!fixture);
      return undefined;
    }

    let mounted = true;
    setAdpLoading(true);
    apiFetch(`/api/draft-assistant/adp?format=${scoringFormat}&teams=12`)
      .then((data) => { if (mounted) setAdpData(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setAdpLoading(false); });
    return () => { mounted = false; };
  }, [scoringFormat]);

  function toggleNeed(pos) {
    setNeeds((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    setHasSubmitted(true);

    try {
      if (fixtureActive) {
        if (!fixture) return;
        setResult({
          ...fixture.result,
          scoring_format: scoringFormat,
          draft_position: Number(draftPosition) || 5,
          round: Number(round) || 1,
          position_needs: [...needs],
        });
        return;
      }
      const data = await apiFetch('/api/draft-assistant/recommendations', {
        method: 'POST',
        body: {
          scoring_format: scoringFormat,
          draft_position: Number(draftPosition) || 5,
          round: Number(round) || 1,
          position_needs: [...needs],
        },
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to get draft recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const scoringLabel = SCORING_FORMATS.find((f) => f.value === scoringFormat)?.label ?? '';
  const bannerMessage = fixtureActive
    ? `${fixture?.fixture_label ?? 'Preview Mode - fixture loading.'} Draft board and recommendations are mock.`
    : `Preview Mode — example recommendations. Live personalization activates when the season begins.${adpData?.is_mock ? ' ADP data is preview only.' : ''}`;

  return (
    <div className="space-y-6">
      <MockBanner message={bannerMessage} />

      <PageHero
        eyebrow={cry ? `DRAFT ASSISTANT · ${cry}` : 'DRAFT ASSISTANT'}
        title="Your next pick"
        subtitle="Tell Omen where you are in your draft. It will surface the best available move for your roster."
      />

      <form
        className="space-y-5 rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        onSubmit={handleSubmit}
      >
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Scoring Format
          </legend>
          <div className="mt-2">
            <SegmentedControl value={scoringFormat} onValueChange={setScoringFormat}>
              {SCORING_FORMATS.map(({ value, label }) => (
                <SegmentedControl.Item key={value} value={value}>{label}</SegmentedControl.Item>
              ))}
            </SegmentedControl>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Draft Position (1–12)
            <Input
              max="12"
              min="1"
              type="number"
              value={draftPosition}
              onChange={(e) => setDraftPosition(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Current Round (1–15)
            <Input
              max="15"
              min="1"
              type="number"
              value={round}
              onChange={(e) => setRound(e.target.value)}
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Position Needs
          </legend>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Select the positions you still need to fill.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POSITION_NEEDS.map((pos) => {
              const isSelected = needs.has(pos);
              return (
                <button
                  key={pos}
                  aria-pressed={isSelected}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-team-accent)]"
                  style={isSelected
                    ? { borderColor: 'var(--color-team-accent)', background: 'var(--color-team-accent)', color: 'var(--color-text-on-accent)' }
                    : { borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                  type="button"
                  onClick={() => toggleNeed(pos)}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button
          variant="primary"
          size="md"
          type="submit"
          loading={loading}
          disabled={loading || (fixtureActive && !fixture)}
        >
          {loading ? 'Analyzing...' : hasSubmitted ? 'Run Again' : 'Get Recommendation'}
        </Button>
      </form>

      {loading && <LoadingRecommendations />}

      {!loading && error && (
        <ErrorState
          title="Failed to get recommendations"
          message={error}
          onRetry={handleSubmit}
        />
      )}

      {!loading && result?.recommendations?.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Recommendations — Round {result.round} · Position {result.draft_position} · {scoringLabel}
          </p>
          {result.recommendations.map((rec) => (
            <RecommendationCard
              key={rec.rank}
              rec={rec}
              adpMap={adpMap}
              adpLoading={adpLoading}
              connectedPlatform={connectedPlatform}
            />
          ))}
        </div>
      )}
    </div>
  );
}
