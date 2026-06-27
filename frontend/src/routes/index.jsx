import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';
import Account from '../pages/Account.jsx';
import ConnectLeague from '../pages/ConnectLeague.jsx';
import Demo from '../pages/Demo.jsx';
import DraftAssistant from '../pages/DraftAssistant.jsx';
import Football from '../pages/Football';
import OmenLanding from '../pages/OmenLanding.jsx';
import Landing from '../pages/Landing.jsx';
import Login from '../pages/Login.jsx';
import NotFound from '../pages/NotFound.jsx';
import Onboarding from '../pages/Onboarding.jsx';
import OmenPage from '../pages/OmenPage.jsx';
import Appearance from '../pages/Appearance.jsx';
import TradeAnalyzer from '../pages/TradeAnalyzer.jsx';
import Ledger from '../pages/Ledger.jsx';
import Standings from '../pages/Standings.jsx';

// Dev-only harness — Vite replaces import.meta.env.DEV with `false` at build time,
// making the dynamic import unreachable and tree-shaking Omen.jsx out of the prod bundle.
const OmenHarness = import.meta.env.DEV
  ? lazy(() => import('../pages/Omen.jsx'))
  : null;

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<OmenLanding />} />
      <Route path="/corvus" element={<Navigate to="/about" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/trade" element={<AppLayout><TradeAnalyzer /></AppLayout>} />
      <Route path="/draft" element={<AppLayout><DraftAssistant /></AppLayout>} />
      <Route path="/demo" element={<Demo />} />

      {/* ConnectLeague handles its own auth gate internally */}
      <Route path="/account/connect" element={<ConnectLeague />} />

      {/* Team theme / appearance — auth required */}
      <Route
        path="/account/appearance"
        element={
          <ProtectedRoute>
            <Appearance />
          </ProtectedRoute>
        }
      />

      {/* Onboarding — protected; skips to /football if already complete */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Auth-required routes */}
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        }
      />
      <Route
        path="/football"
        element={
          <ProtectedRoute>
            <Football />
          </ProtectedRoute>
        }
      />
      <Route
        path="/omen"
        element={
          <ProtectedRoute>
            <OmenPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ledger"
        element={
          <ProtectedRoute>
            <Ledger />
          </ProtectedRoute>
        }
      />

      <Route
        path="/standings"
        element={
          <ProtectedRoute>
            <Standings />
          </ProtectedRoute>
        }
      />

      {/* Dev-only harness — available at /dev/omen in local Vite, stripped from prod */}
      {import.meta.env.DEV && OmenHarness && (
        <Route
          path="/dev/omen"
          element={
            <Suspense fallback={null}>
              <AppLayout><OmenHarness /></AppLayout>
            </Suspense>
          }
        />
      )}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
