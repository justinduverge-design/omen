/**
 * Demo.jsx — Phase 2.7 public `/demo` route.
 *
 * Renders the deterministic `omen-demo.v1` fixture from `GET /api/demo` using
 * the shared <OmenRecommendationView>. Per `Blueprints/demo-mode.md`:
 *  - Persistent, non-dismissible Demo Mode label in view.
 *  - Demo state is its own product state — never silently merges with a
 *    connected league. The conversion CTA is "Connect a league".
 *  - No HITL feedback, no analytics events from the demo render.
 *
 * No auth required. No Supabase, no platform, no LLM is touched on this path
 * (the backend service is similarly isolated).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { Alert, AlertDescription, AlertTitle, Button, Card, PageHero } from '../components/ui/index.js';
import { ApiError, apiFetch } from '../lib/api.js';
import { setDataMode } from '../lib/dataMode.js';
import { OmenRecommendationView } from './OmenOfTheWeek.jsx';

function DemoBanner({ notice }) {
  const label = notice?.label ?? 'Demo Mode';
  const message = notice?.message
    ?? 'Sample league and roster data. This is not live fantasy advice.';
  return (
    <Alert role="status" aria-live="polite">
      <AlertTitle>{label}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function DemoHeader() {
  return (
    <PageHero
      eyebrow="OMEN DEMO"
      title="See Omen on a sample league."
      subtitle="This is a fixed example so you can read the shape of an Omen call before you connect your own league. Numbers and rosters here are illustrative — the real version reads your roster from Yahoo, Sleeper, or ESPN."
    />
  );
}

function LoadingGate() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-busy="true">
      <div className="h-5 w-32 rounded-md bg-slate-800" />
      <div className="h-8 w-64 rounded-md bg-slate-800" />
      <div className="h-48 rounded-xl bg-slate-800" />
    </div>
  );
}

function ErrorBlock({ message, onRetry }) {
  return (
    <Card variant="error" tone="risk">
      <Card.Header title="Demo Mode is temporarily unavailable" />
      <Card.Body>{message}</Card.Body>
      <Card.Footer>
        <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
      </Card.Footer>
    </Card>
  );
}

function ConversionFooter() {
  return (
    <Card variant="solid">
      <Card.Header eyebrow="Ready for the real call?" />
      <Card.Body>
        Connect Yahoo, Sleeper, or ESPN and Omen reads your actual roster.
      </Card.Body>
      <Card.Footer className="flex-col gap-2 sm:flex-row">
        <Button variant="primary" size="md" asChild>
          <Link to="/account/connect">Connect a league</Link>
        </Button>
        <Button variant="secondary" size="md" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </Card.Footer>
    </Card>
  );
}

function useDemoData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch('/api/demo')
      .then((result) => setData(result))
      .catch((err) => {
        const msg = err instanceof ApiError
          ? err.message
          : 'Could not load the demo payload. Please try again.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  return { data, loading, error, retry: load };
}

export default function Demo() {
  const { data, loading, error, retry } = useDemoData();

  // Declare the route's data mode for <MomentChrome> and any chrome consumers.
  // Demo is its own mode (allowed alongside 'mock'); fail-closed cultural
  // moments stay suppressed because `/demo` isn't in ROUTE_SCOPES.
  useEffect(() => {
    setDataMode('demo');
    return () => setDataMode(null);
  }, []);

  return (
    <AppLayout>
      <DemoHeader />

      {/* Persistent Demo Mode label — kept above any render state so it's
          always in view per Blueprints/demo-mode.md §Visible labeling. */}
      <DemoBanner notice={data?.demo_notice} />

      {loading && <LoadingGate />}
      {error && !loading && <ErrorBlock message={error} onRetry={retry} />}
      {data?.omen && !loading && !error && (
        <OmenRecommendationView
          data={data.omen}
          showFeedback={false}
          banner={null}
        />
      )}

      <ConversionFooter />
    </AppLayout>
  );
}
