import { Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';
import Account from '../pages/Account.jsx';
import ConnectLeague from '../pages/ConnectLeague.jsx';
import DraftAssistant from '../pages/DraftAssistant.jsx';
import Football from '../pages/Football';
import Landing from '../pages/Landing.jsx';
import Login from '../pages/Login.jsx';
import NotFound from '../pages/NotFound.jsx';
import OmenPage from '../pages/OmenPage.jsx';
import TeamTheme from '../pages/TeamTheme.jsx';
import TradeAnalyzer from '../pages/TradeAnalyzer.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/trade" element={<AppLayout><TradeAnalyzer /></AppLayout>} />
      <Route path="/draft" element={<AppLayout><DraftAssistant /></AppLayout>} />

      {/* ConnectLeague handles its own auth gate internally */}
      <Route path="/account/connect" element={<ConnectLeague />} />

      {/* Team theme / appearance — auth required */}
      <Route
        path="/account/appearance"
        element={
          <ProtectedRoute>
            <TeamTheme />
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
