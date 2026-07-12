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
import TradeAnalyzer from '../pages/TradeAnalyzer.jsx';
import TradeShare from '../pages/TradeShare.jsx';
import Ledger from '../pages/Ledger.jsx';
import Standings from '../pages/Standings.jsx';
import WaiverWire from '../pages/WaiverWire.jsx';

// Dev-only harness — Vite replaces import.meta.env.DEV with `false` at build time,
// making the dynamic import unreachable and tree-shaking Omen.jsx out of the prod bundle.
const OmenHarness = import.meta.env.DEV
  ? lazy(() => import('../pages/Omen.jsx'))
  : null;

const PromoCapture = import.meta.env.DEV
  ? lazy(() => import('../pages/PromoCapture.jsx'))
  : null;

const PromoTradeCapture = import.meta.env.DEV
  ? lazy(() => import('../pages/PromoTradeCapture.jsx'))
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
      <Route path="/trade/share/:hash" element={<AppLayout><TradeShare /></AppLayout>} />
      <Route path="/draft" element={<AppLayout><DraftAssistant /></AppLayout>} />
      <Route path="/demo" element={<Demo />} />

      {/* ConnectLeague handles its own auth gate internally */}
      <Route path="/account/connect" element={<ConnectLeague />} />

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

      <Route
        path="/waiver"
        element={
          <ProtectedRoute>
            <AppLayout><WaiverWire /></AppLayout>
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

      {import.meta.env.DEV && PromoCapture && (
        <Route
          path="/dev/promo-capture"
          element={
            <Suspense fallback={null}>
              <AppLayout><PromoCapture /></AppLayout>
            </Suspense>
          }
        />
      )}

      {import.meta.env.DEV && PromoTradeCapture && (
        <Route
          path="/dev/promo-trade"
          element={
            <Suspense fallback={null}>
              <AppLayout><PromoTradeCapture /></AppLayout>
            </Suspense>
          }
        />
      )}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
