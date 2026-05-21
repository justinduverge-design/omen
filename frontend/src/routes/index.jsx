import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';
import Account from '../pages/Account.jsx';
import Football from '../pages/Football';
import Landing from '../pages/Landing.jsx';
import NotFound from '../pages/NotFound.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/football"
        element={
          <ProtectedRoute>
            <Football />
          </ProtectedRoute>
        }
      />
      <Route path="/account" element={<Account />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
